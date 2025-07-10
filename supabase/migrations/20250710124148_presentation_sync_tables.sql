-- Migration: Presentation Sync Tables
-- Description: Add real-time presentation synchronization functionality for GAMMA workshops
-- Date: 2025-01-10

-- ==================================================
-- 1. CREATE PRESENTATION SESSIONS TABLE
-- ==================================================

CREATE TABLE presentation_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id uuid REFERENCES modules(id) ON DELETE CASCADE NOT NULL,
  instructor_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  current_slide integer DEFAULT 1 NOT NULL,
  total_slides integer NOT NULL CHECK (total_slides > 0),
  is_active boolean DEFAULT true NOT NULL,
  session_name text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  
  -- Constraints
  CONSTRAINT valid_slide_range CHECK (current_slide >= 1 AND current_slide <= total_slides)
);

-- Add indexes for performance
CREATE INDEX idx_presentation_sessions_module_id ON presentation_sessions(module_id);
CREATE INDEX idx_presentation_sessions_instructor_id ON presentation_sessions(instructor_id);
CREATE INDEX idx_presentation_sessions_active ON presentation_sessions(is_active) WHERE is_active = true;
CREATE INDEX idx_presentation_sessions_updated_at ON presentation_sessions(updated_at);

-- ==================================================
-- 2. CREATE SESSION PARTICIPANTS TABLE
-- ==================================================

CREATE TABLE session_participants (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid REFERENCES presentation_sessions(id) ON DELETE CASCADE NOT NULL,
  student_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  is_synced boolean DEFAULT true NOT NULL,
  last_seen_slide integer DEFAULT 1 NOT NULL,
  joined_at timestamptz DEFAULT now() NOT NULL,
  last_activity timestamptz DEFAULT now() NOT NULL,
  
  -- Ensure unique participation per session
  UNIQUE(session_id, student_id)
);

-- Add indexes for performance
CREATE INDEX idx_session_participants_session_id ON session_participants(session_id);
CREATE INDEX idx_session_participants_student_id ON session_participants(student_id);
CREATE INDEX idx_session_participants_last_activity ON session_participants(last_activity);
CREATE INDEX idx_session_participants_synced ON session_participants(is_synced);

-- ==================================================
-- 3. ENHANCE MODULES TABLE
-- ==================================================

-- Add presentation metadata columns to existing modules table
ALTER TABLE modules ADD COLUMN IF NOT EXISTS 
  pdf_total_pages integer CHECK (pdf_total_pages > 0);

ALTER TABLE modules ADD COLUMN IF NOT EXISTS 
  supports_sync boolean DEFAULT false NOT NULL;

ALTER TABLE modules ADD COLUMN IF NOT EXISTS 
  presentation_title text;

-- Add index for sync-enabled modules
CREATE INDEX idx_modules_supports_sync ON modules(supports_sync) WHERE supports_sync = true;

-- ==================================================
-- 4. ENABLE ROW LEVEL SECURITY
-- ==================================================

-- Enable RLS on new tables
ALTER TABLE presentation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_participants ENABLE ROW LEVEL SECURITY;

-- ==================================================
-- 5. CREATE RLS POLICIES FOR PRESENTATION_SESSIONS
-- ==================================================

-- Policy: Instructors can manage their own sessions
CREATE POLICY "instructors_manage_own_sessions"
ON presentation_sessions FOR ALL TO authenticated
USING (
  -- Must be the instructor of the class containing the module
  EXISTS (
    SELECT 1 FROM modules m
    JOIN classes c ON c.id = m.class_id
    WHERE m.id = module_id
    AND c.instructor_id = auth.uid()
  )
  OR
  -- Or be a super admin
  (auth.jwt() ->> 'user_metadata')::jsonb ->> 'is_super_admin' = 'true'
);

-- Policy: Students can view sessions for their enrolled classes
CREATE POLICY "students_view_enrolled_sessions"
ON presentation_sessions FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM enrollments e
    JOIN modules m ON m.class_id = e.class_id
    WHERE m.id = module_id
    AND e.user_id = auth.uid()
    AND e.status = 'active'
  )
);

-- ==================================================
-- 6. CREATE RLS POLICIES FOR SESSION_PARTICIPANTS
-- ==================================================

-- Policy: Users can manage their own participation
CREATE POLICY "users_manage_own_participation"
ON session_participants FOR ALL TO authenticated
USING (student_id = auth.uid());

-- Policy: Instructors can view participants in their sessions
CREATE POLICY "instructors_view_session_participants"
ON session_participants FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM presentation_sessions ps
    JOIN modules m ON m.id = ps.module_id
    JOIN classes c ON c.id = m.class_id
    WHERE ps.id = session_id
    AND c.instructor_id = auth.uid()
  )
);

-- ==================================================
-- 7. CREATE FUNCTIONS FOR AUTOMATION
-- ==================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_presentation_session_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically update last_activity timestamp
CREATE OR REPLACE FUNCTION update_participant_last_activity()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_activity = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==================================================
-- 8. CREATE TRIGGERS
-- ==================================================

-- Trigger to auto-update presentation_sessions.updated_at
CREATE TRIGGER trigger_update_presentation_session_timestamp
  BEFORE UPDATE ON presentation_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_presentation_session_updated_at();

-- Trigger to auto-update session_participants.last_activity
CREATE TRIGGER trigger_update_participant_activity
  BEFORE UPDATE ON session_participants
  FOR EACH ROW
  EXECUTE FUNCTION update_participant_last_activity();

-- ==================================================
-- 9. CREATE HELPFUL VIEWS
-- ==================================================

-- View: Active presentation sessions with class and instructor info
CREATE VIEW active_presentation_sessions AS
SELECT 
  ps.id,
  ps.module_id,
  ps.instructor_id,
  ps.current_slide,
  ps.total_slides,
  ps.session_name,
  ps.created_at,
  ps.updated_at,
  m.title as module_title,
  c.title as class_title,
  c.instructor_id as class_instructor_id
FROM presentation_sessions ps
JOIN modules m ON m.id = ps.module_id
JOIN classes c ON c.id = m.class_id
WHERE ps.is_active = true;

-- View: Session participant summary with user info
CREATE VIEW session_participant_summary AS
SELECT 
  sp.session_id,
  sp.student_id,
  sp.is_synced,
  sp.last_seen_slide,
  sp.joined_at,
  sp.last_activity,
  ps.current_slide as session_current_slide,
  (sp.last_seen_slide = ps.current_slide) as is_up_to_date,
  EXTRACT(EPOCH FROM (sp.last_activity - sp.joined_at))/60 as session_duration_minutes
FROM session_participants sp
JOIN presentation_sessions ps ON ps.id = sp.session_id
WHERE ps.is_active = true;

-- ==================================================
-- 10. INSERT SAMPLE DATA (OPTIONAL)
-- ==================================================

-- Note: This would be for testing only, remove in production
-- INSERT INTO presentation_sessions (module_id, instructor_id, total_slides, session_name)
-- SELECT 
--   m.id,
--   c.instructor_id,
--   10, -- Sample slide count
--   'Sample GAMMA Presentation'
-- FROM modules m
-- JOIN classes c ON c.id = m.class_id
-- WHERE m.slide_pdf_url IS NOT NULL
-- LIMIT 1;

-- ==================================================
-- 11. ENABLE REALTIME FOR PRESENTATION SESSIONS
-- ==================================================

-- Enable realtime replication for presentation_sessions table
-- This allows real-time updates to be pushed to connected clients
ALTER PUBLICATION supabase_realtime ADD TABLE presentation_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE session_participants;

-- ==================================================
-- MIGRATION COMPLETE
-- ==================================================

-- Summary:
-- ✅ Created presentation_sessions table with proper constraints
-- ✅ Created session_participants table with unique constraints  
-- ✅ Enhanced modules table with presentation metadata
-- ✅ Enabled Row Level Security on all new tables
-- ✅ Created comprehensive RLS policies for instructors and students
-- ✅ Added performance indexes on key columns
-- ✅ Created helper functions and triggers for automation
-- ✅ Created useful views for querying session data
-- ✅ Enabled realtime replication for live updates

-- Next Steps:
-- 1. Apply this migration: supabase db push
-- 2. Verify realtime is working: Check Supabase dashboard
-- 3. Test RLS policies with different user roles
-- 4. Implement frontend PresentationSyncManager class 