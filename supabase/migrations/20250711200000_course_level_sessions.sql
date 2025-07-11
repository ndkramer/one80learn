-- Migration: Extend presentation sessions to support course-level sessions
-- Created: 2024-07-11

-- ==================================================
-- 1. ADD CLASS-LEVEL FIELDS TO PRESENTATION_SESSIONS
-- ==================================================

-- Add class_id and current_module_id fields to support course-level sessions
ALTER TABLE presentation_sessions 
ADD COLUMN IF NOT EXISTS class_id uuid REFERENCES classes(id) ON DELETE CASCADE;

ALTER TABLE presentation_sessions 
ADD COLUMN IF NOT EXISTS current_module_id uuid REFERENCES modules(id) ON DELETE CASCADE;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_presentation_sessions_class_id ON presentation_sessions(class_id);
CREATE INDEX IF NOT EXISTS idx_presentation_sessions_current_module ON presentation_sessions(current_module_id);

-- ==================================================
-- 2. UPDATE EXISTING SESSIONS TO HAVE CLASS_ID
-- ==================================================

-- Populate class_id for existing sessions based on module_id
UPDATE presentation_sessions 
SET class_id = m.class_id,
    current_module_id = module_id
FROM modules m 
WHERE presentation_sessions.module_id = m.id
  AND presentation_sessions.class_id IS NULL;

-- ==================================================
-- 3. CREATE COURSE SESSION MANAGEMENT FUNCTIONS
-- ==================================================

-- Function to create a course-level session
CREATE OR REPLACE FUNCTION create_course_session(
  p_class_id uuid,
  p_instructor_id uuid,
  p_session_name text DEFAULT NULL
) RETURNS uuid AS $$
DECLARE
  session_id uuid;
BEGIN
  -- Check if instructor is authorized for this class
  IF NOT EXISTS (
    SELECT 1 FROM classes 
    WHERE id = p_class_id 
    AND instructor_id = p_instructor_id
  ) THEN
    RAISE EXCEPTION 'Unauthorized: User is not instructor of this class';
  END IF;

  -- End any existing active sessions for this class
  UPDATE presentation_sessions 
  SET is_active = false, updated_at = NOW()
  WHERE class_id = p_class_id AND is_active = true;

  -- Create new course session (without specific module initially)
  INSERT INTO presentation_sessions (
    class_id,
    instructor_id,
    session_name,
    total_slides,
    current_slide,
    is_active
  ) VALUES (
    p_class_id,
    p_instructor_id,
    COALESCE(p_session_name, 'Course Presentation'),
    1, -- Will be updated when switching to first module
    1,
    true
  ) RETURNING id INTO session_id;

  RETURN session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to switch to a specific module within an active course session
CREATE OR REPLACE FUNCTION switch_session_to_module(
  p_session_id uuid,
  p_module_id uuid,
  p_total_slides integer,
  p_start_slide integer DEFAULT 1
) RETURNS boolean AS $$
DECLARE
  session_class_id uuid;
  module_class_id uuid;
BEGIN
  -- Get session class_id
  SELECT class_id INTO session_class_id
  FROM presentation_sessions
  WHERE id = p_session_id AND is_active = true;

  IF session_class_id IS NULL THEN
    RAISE EXCEPTION 'Session not found or not active';
  END IF;

  -- Get module class_id
  SELECT class_id INTO module_class_id
  FROM modules
  WHERE id = p_module_id;

  IF module_class_id IS NULL THEN
    RAISE EXCEPTION 'Module not found';
  END IF;

  -- Verify module belongs to same class as session
  IF session_class_id != module_class_id THEN
    RAISE EXCEPTION 'Module does not belong to the same class as the session';
  END IF;

  -- Update session to point to new module
  UPDATE presentation_sessions
  SET 
    current_module_id = p_module_id,
    module_id = p_module_id, -- Keep for backward compatibility
    total_slides = p_total_slides,
    current_slide = p_start_slide,
    updated_at = NOW()
  WHERE id = p_session_id;

  -- Reset all participants to be in sync with new module
  UPDATE session_participants
  SET 
    last_seen_slide = p_start_slide,
    is_synced = true,
    last_activity = NOW()
  WHERE session_id = p_session_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get the current module for a session
CREATE OR REPLACE FUNCTION get_session_current_module(p_session_id uuid)
RETURNS TABLE (
  module_id uuid,
  module_title text,
  step_number integer,
  total_slides integer,
  current_slide integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ps.current_module_id,
    s.title,
    s.step_number,
    ps.total_slides,
    ps.current_slide
  FROM presentation_sessions ps
  LEFT JOIN steps s ON s.module_id = ps.current_module_id
  WHERE ps.id = p_session_id AND ps.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==================================================
-- 4. UPDATE RLS POLICIES FOR CLASS-LEVEL ACCESS
-- ==================================================

-- Drop existing policies and recreate for class-level access
DROP POLICY IF EXISTS "instructors_manage_own_sessions" ON presentation_sessions;
DROP POLICY IF EXISTS "students_view_enrolled_sessions" ON presentation_sessions;

-- New policy: Instructors can manage sessions for their classes
CREATE POLICY "instructors_manage_class_sessions"
ON presentation_sessions FOR ALL TO authenticated
USING (
  -- Must be the instructor of the class
  EXISTS (
    SELECT 1 FROM classes c
    WHERE c.id = class_id
    AND c.instructor_id = auth.uid()
  )
  OR
  -- Or be a super admin
  (auth.jwt() ->> 'user_metadata')::jsonb ->> 'is_super_admin' = 'true'
);

-- New policy: Students can view sessions for classes they're enrolled in
CREATE POLICY "students_view_enrolled_class_sessions"
ON presentation_sessions FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM enrollments e
    WHERE e.class_id = class_id
    AND e.user_id = auth.uid()
    AND e.status = 'active'
  )
);

-- ==================================================
-- 5. CREATE HELPER VIEWS FOR COURSE SESSIONS
-- ==================================================

-- View: Active course sessions with full context
CREATE OR REPLACE VIEW active_course_sessions AS
SELECT 
  ps.id,
  ps.class_id,
  ps.current_module_id,
  ps.instructor_id,
  ps.current_slide,
  ps.total_slides,
  ps.session_name,
  ps.created_at,
  ps.updated_at,
  c.title as class_title,
  CASE 
    WHEN ps.current_module_id IS NOT NULL THEN s.title 
    ELSE 'No Module Selected'
  END as current_module_title,
  CASE 
    WHEN ps.current_module_id IS NOT NULL THEN s.step_number 
    ELSE 0
  END as current_step_number,
  (
    SELECT COUNT(*) 
    FROM session_participants sp 
    WHERE sp.session_id = ps.id
  ) as participant_count
FROM presentation_sessions ps
JOIN classes c ON c.id = ps.class_id
LEFT JOIN steps s ON s.module_id = ps.current_module_id
WHERE ps.is_active = true;

-- ==================================================
-- 6. MIGRATION CLEANUP AND VALIDATION
-- ==================================================

-- Ensure all existing sessions have class_id populated
DO $$
DECLARE
  orphaned_sessions_count integer;
BEGIN
  -- Count sessions without class_id
  SELECT COUNT(*) INTO orphaned_sessions_count
  FROM presentation_sessions 
  WHERE class_id IS NULL;
  
  IF orphaned_sessions_count > 0 THEN
    RAISE LOG 'Found % sessions without class_id that need manual review', orphaned_sessions_count;
  ELSE
    RAISE LOG 'All presentation sessions have been successfully migrated to course-level';
  END IF;
END $$;

-- Add helpful comments
COMMENT ON COLUMN presentation_sessions.class_id IS 'Links session to a course/class for multi-module support';
COMMENT ON COLUMN presentation_sessions.current_module_id IS 'Tracks which module is currently being presented in the session';
COMMENT ON FUNCTION create_course_session(uuid, uuid, text) IS 'Creates a new course-level presentation session';
COMMENT ON FUNCTION switch_session_to_module(uuid, uuid, integer, integer) IS 'Switches an active session to present a different module';

-- ==================================================
-- MIGRATION COMPLETE
-- ==================================================

-- Summary:
-- ✅ Extended presentation_sessions to support class-level sessions
-- ✅ Added current_module_id to track active module within session
-- ✅ Created functions for course session management
-- ✅ Updated RLS policies for class-level access
-- ✅ Created helper views for course session queries
-- ✅ Maintained backward compatibility with existing module_id field
-- ✅ Enhanced participant sync across module transitions

-- Next Steps:
-- 1. Apply this migration: Execute in Supabase Dashboard
-- 2. Update PresentationSyncManager to use new functions
-- 3. Update InstructorPresentationControl for multi-module support
-- 4. Test cross-module session continuity 