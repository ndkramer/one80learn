-- Migration: Add Step-Level Synchronization Support
-- Description: Extend presentation sessions to track current step within modules
-- Date: 2025-01-15

-- ==================================================
-- 1. ADD STEP TRACKING TO PRESENTATION SESSIONS
-- ==================================================

-- Add current_step_id field to track which specific step is being presented
ALTER TABLE presentation_sessions 
ADD COLUMN IF NOT EXISTS current_step_id uuid REFERENCES steps(id) ON DELETE CASCADE;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_presentation_sessions_current_step ON presentation_sessions(current_step_id);

-- ==================================================
-- 2. CREATE STEP-LEVEL SESSION FUNCTIONS
-- ==================================================

-- Function to switch to a specific step within the same module
CREATE OR REPLACE FUNCTION switch_session_to_step(
  p_session_id uuid,
  p_step_id uuid,
  p_total_slides integer,
  p_start_slide integer DEFAULT 1
) RETURNS boolean AS $$
DECLARE
  session_class_id uuid;
  step_module_id uuid;
  step_class_id uuid;
BEGIN
  -- Get session class_id
  SELECT class_id INTO session_class_id
  FROM presentation_sessions
  WHERE id = p_session_id AND is_active = true;

  IF session_class_id IS NULL THEN
    RAISE EXCEPTION 'Session not found or not active';
  END IF;

  -- Get step module_id and class_id
  SELECT s.module_id, m.class_id INTO step_module_id, step_class_id
  FROM steps s
  JOIN modules m ON m.id = s.module_id
  WHERE s.id = p_step_id;

  IF step_module_id IS NULL THEN
    RAISE EXCEPTION 'Step not found';
  END IF;

  -- Verify step belongs to same class as session
  IF session_class_id != step_class_id THEN
    RAISE EXCEPTION 'Step does not belong to the same class as the session';
  END IF;

  -- Update session to point to new step
  UPDATE presentation_sessions
  SET 
    current_step_id = p_step_id,
    current_module_id = step_module_id,
    module_id = step_module_id, -- Keep for backward compatibility
    total_slides = p_total_slides,
    current_slide = p_start_slide,
    updated_at = NOW()
  WHERE id = p_session_id;

  -- Reset all participants to be in sync with new step
  UPDATE session_participants
  SET 
    last_seen_slide = p_start_slide,
    is_synced = true,
    last_activity = NOW()
  WHERE session_id = p_session_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current step information for a session
CREATE OR REPLACE FUNCTION get_session_current_step(p_session_id uuid)
RETURNS TABLE (
  step_id uuid,
  step_title text,
  step_number integer,
  module_id uuid,
  module_title text,
  total_slides integer,
  current_slide integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ps.current_step_id,
    s.title,
    s.step_number,
    ps.current_module_id,
    m.title,
    ps.total_slides,
    ps.current_slide
  FROM presentation_sessions ps
  LEFT JOIN steps s ON s.id = ps.current_step_id
  LEFT JOIN modules m ON m.id = ps.current_module_id
  WHERE ps.id = p_session_id AND ps.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==================================================
-- 3. UPDATE EXISTING FUNCTIONS TO HANDLE STEPS
-- ==================================================

-- Update switch_session_to_module to also set current_step_id
CREATE OR REPLACE FUNCTION switch_session_to_module(
  p_session_id uuid,
  p_module_id uuid,
  p_total_slides integer,
  p_start_slide integer DEFAULT 1
) RETURNS boolean AS $$
DECLARE
  session_class_id uuid;
  module_class_id uuid;
  first_step_id uuid;
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

  -- Get first step of the module
  SELECT id INTO first_step_id
  FROM steps
  WHERE module_id = p_module_id
  ORDER BY step_number ASC
  LIMIT 1;

  -- Update session to point to new module and first step
  UPDATE presentation_sessions
  SET 
    current_module_id = p_module_id,
    current_step_id = first_step_id,
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

-- ==================================================
-- 4. CREATE ENHANCED VIEWS
-- ==================================================

-- Drop existing view to avoid column conflicts
DROP VIEW IF EXISTS active_course_sessions;

-- Create enhanced view with step information
CREATE VIEW active_course_sessions AS
SELECT 
  ps.id,
  ps.class_id,
  ps.current_module_id,
  ps.current_step_id,
  ps.instructor_id,
  ps.current_slide,
  ps.total_slides,
  ps.session_name,
  ps.created_at,
  ps.updated_at,
  c.title as class_title,
  CASE 
    WHEN ps.current_module_id IS NOT NULL THEN m.title 
    ELSE 'No Module Selected'
  END as current_module_title,
  CASE 
    WHEN ps.current_step_id IS NOT NULL THEN s.title 
    ELSE 'No Step Selected'
  END as current_step_title,
  CASE 
    WHEN ps.current_step_id IS NOT NULL THEN s.step_number 
    ELSE 0
  END as current_step_number,
  (
    SELECT COUNT(*) 
    FROM session_participants sp 
    WHERE sp.session_id = ps.id
  ) as participant_count
FROM presentation_sessions ps
JOIN classes c ON c.id = ps.class_id
LEFT JOIN modules m ON m.id = ps.current_module_id
LEFT JOIN steps s ON s.id = ps.current_step_id
WHERE ps.is_active = true;

-- ==================================================
-- 5. ADD HELPFUL COMMENTS
-- ==================================================

COMMENT ON COLUMN presentation_sessions.current_step_id IS 'Tracks which specific step is currently being presented within the module';
COMMENT ON FUNCTION switch_session_to_step(uuid, uuid, integer, integer) IS 'Switches an active session to present a specific step';
COMMENT ON FUNCTION get_session_current_step(uuid) IS 'Returns detailed information about the current step being presented';

-- ==================================================
-- MIGRATION COMPLETE
-- ==================================================

-- Summary:
-- ✅ Added current_step_id field to presentation_sessions table
-- ✅ Created switch_session_to_step function for step-level navigation
-- ✅ Updated switch_session_to_module to handle step tracking
-- ✅ Created get_session_current_step for step information queries
-- ✅ Enhanced active_course_sessions view with step details
-- ✅ Added performance indexes for step queries

-- Next Steps:
-- 1. Apply this migration to Supabase
-- 2. Update PresentationSyncManager to use step-level functions
-- 3. Test step-to-step synchronization
-- 4. Verify students follow instructor step changes 