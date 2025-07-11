/*
  # Multi-Step System Implementation
  
  Transform the module system to support multiple steps per module.
  Each step will have its own content, slides, and notes.
  
  1. New Tables
    - steps: Individual learning steps within modules
    - step_completion: Track completion status of individual steps
    - step_notes: User notes for specific steps (replaces module-level notes)
  
  2. Data Migration
    - Migrate existing module content to first step of each module
    - Migrate existing notes to step-based system
    - Preserve all existing user progress and data
  
  3. Security
    - Enable RLS on all new tables
    - Set up policies for authenticated access
    - Maintain user data isolation
*/

-- ==================================================
-- 1. CREATE STEPS TABLE
-- ==================================================

CREATE TABLE steps (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id uuid REFERENCES modules(id) ON DELETE CASCADE NOT NULL,
  step_number integer NOT NULL CHECK (step_number > 0),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  slide_pdf_url text,
  content text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  
  -- Ensure unique step numbers within each module
  UNIQUE(module_id, step_number)
);

-- Add indexes for performance
CREATE INDEX idx_steps_module_id ON steps(module_id);
CREATE INDEX idx_steps_module_step ON steps(module_id, step_number);
CREATE INDEX idx_steps_created_at ON steps(created_at);

-- Add updated_at trigger
CREATE TRIGGER update_steps_updated_at
  BEFORE UPDATE ON steps
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE steps ENABLE ROW LEVEL SECURITY;

-- ==================================================
-- 2. CREATE STEP COMPLETION TRACKING
-- ==================================================

CREATE TABLE step_completion (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  step_id uuid REFERENCES steps(id) ON DELETE CASCADE NOT NULL,
  completed boolean DEFAULT false NOT NULL,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  
  -- Ensure unique completion record per user per step
  UNIQUE(user_id, step_id)
);

-- Add indexes for performance
CREATE INDEX idx_step_completion_user_id ON step_completion(user_id);
CREATE INDEX idx_step_completion_step_id ON step_completion(step_id);
CREATE INDEX idx_step_completion_user_step ON step_completion(user_id, step_id);
CREATE INDEX idx_step_completion_completed ON step_completion(completed) WHERE completed = true;

-- Add updated_at trigger
CREATE TRIGGER update_step_completion_updated_at
  BEFORE UPDATE ON step_completion
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add trigger to set completed_at when marked complete
CREATE OR REPLACE FUNCTION set_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.completed = true AND OLD.completed = false THEN
    NEW.completed_at = now();
  ELSIF NEW.completed = false THEN
    NEW.completed_at = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_step_completion_completed_at
  BEFORE UPDATE ON step_completion
  FOR EACH ROW
  EXECUTE FUNCTION set_completed_at();

-- Enable RLS
ALTER TABLE step_completion ENABLE ROW LEVEL SECURITY;

-- ==================================================
-- 3. CREATE STEP NOTES TABLE (REPLACES MODULE NOTES)
-- ==================================================

CREATE TABLE step_notes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  step_id uuid REFERENCES steps(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  
  -- Ensure unique notes per user per step
  UNIQUE(user_id, step_id)
);

-- Add indexes for performance
CREATE INDEX idx_step_notes_user_id ON step_notes(user_id);
CREATE INDEX idx_step_notes_step_id ON step_notes(step_id);
CREATE INDEX idx_step_notes_user_step ON step_notes(user_id, step_id);

-- Add updated_at trigger
CREATE TRIGGER update_step_notes_updated_at
  BEFORE UPDATE ON step_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE step_notes ENABLE ROW LEVEL SECURITY;

-- ==================================================
-- 4. MIGRATE EXISTING MODULE DATA TO STEPS
-- ==================================================

-- Insert first step for each module using existing module data
INSERT INTO steps (module_id, step_number, title, description, slide_pdf_url, content, created_at, updated_at)
SELECT 
  id as module_id,
  1 as step_number,
  CASE 
    WHEN content IS NOT NULL AND content != '' THEN 'Step 1: ' || title
    ELSE 'Introduction'
  END as title,
  CASE 
    WHEN content IS NOT NULL AND content != '' THEN 'Complete the introductory content for this module.'
    ELSE description
  END as description,
  slide_pdf_url,
  content,
  created_at,
  updated_at
FROM modules
WHERE NOT EXISTS (
  SELECT 1 FROM steps WHERE steps.module_id = modules.id
);

-- ==================================================
-- 5. MIGRATE EXISTING NOTES TO STEP NOTES
-- ==================================================

-- Migrate existing notes to the first step of each module
INSERT INTO step_notes (user_id, step_id, content, created_at, updated_at)
SELECT 
  n.user_id,
  s.id as step_id,
  n.content,
  n.created_at,
  n.updated_at
FROM notes n
JOIN steps s ON s.module_id = n.module_id AND s.step_number = 1
WHERE NOT EXISTS (
  SELECT 1 FROM step_notes sn WHERE sn.user_id = n.user_id AND sn.step_id = s.id
);

-- ==================================================
-- 6. MIGRATE MODULE PROGRESS TO STEP COMPLETION
-- ==================================================

-- Create step completion records for completed modules
INSERT INTO step_completion (user_id, step_id, completed, completed_at, created_at, updated_at)
SELECT 
  mp.user_id,
  s.id as step_id,
  mp.completed,
  CASE WHEN mp.completed THEN mp.updated_at ELSE NULL END as completed_at,
  mp.created_at,
  mp.updated_at
FROM module_progress mp
JOIN steps s ON s.module_id = mp.module_id AND s.step_number = 1
WHERE NOT EXISTS (
  SELECT 1 FROM step_completion sc WHERE sc.user_id = mp.user_id AND sc.step_id = s.id
);

-- ==================================================
-- 7. CREATE RLS POLICIES
-- ==================================================

-- Steps policies (based on existing module policies)
CREATE POLICY "admin_full_access_steps"
ON steps FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.email = 'Nick@one80services.com'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.email = 'Nick@one80services.com'
  )
);

CREATE POLICY "instructor_manage_steps"
ON steps FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM modules m
    JOIN classes c ON c.id = m.class_id
    WHERE m.id = steps.module_id
    AND c.instructor_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM modules m
    JOIN classes c ON c.id = m.class_id
    WHERE m.id = steps.module_id
    AND c.instructor_id = auth.uid()
  )
);

CREATE POLICY "student_view_enrolled_steps"
ON steps FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM modules m
    JOIN enrollments e ON e.class_id = m.class_id
    WHERE m.id = steps.module_id
    AND e.user_id = auth.uid()
    AND e.status = 'active'
  )
);

-- Step completion policies
CREATE POLICY "users_manage_own_step_completion"
ON step_completion FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "admin_view_all_step_completion"
ON step_completion FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.email = 'Nick@one80services.com'
  )
);

CREATE POLICY "instructors_view_student_step_completion"
ON step_completion FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM steps s
    JOIN modules m ON m.id = s.module_id
    JOIN classes c ON c.id = m.class_id
    WHERE s.id = step_completion.step_id
    AND c.instructor_id = auth.uid()
  )
);

-- Step notes policies
CREATE POLICY "users_manage_own_step_notes"
ON step_notes FOR ALL TO authenticated
USING (
  user_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM steps s
    JOIN modules m ON m.id = s.module_id
    JOIN enrollments e ON e.class_id = m.class_id
    WHERE s.id = step_notes.step_id
    AND e.user_id = auth.uid()
    AND e.status = 'active'
  )
)
WITH CHECK (
  user_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM steps s
    JOIN modules m ON m.id = s.module_id
    JOIN enrollments e ON e.class_id = m.class_id
    WHERE s.id = step_notes.step_id
    AND e.user_id = auth.uid()
    AND e.status = 'active'
  )
);

CREATE POLICY "admin_view_all_step_notes"
ON step_notes FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.email = 'Nick@one80services.com'
  )
);

-- ==================================================
-- 8. ADD HELPER FUNCTIONS
-- ==================================================

-- Function to get module progress based on step completion
CREATE OR REPLACE FUNCTION get_module_progress(p_user_id uuid, p_module_id uuid)
RETURNS TABLE(
  total_steps integer,
  completed_steps integer,
  progress_percentage integer,
  is_completed boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(s.id)::integer as total_steps,
    COUNT(CASE WHEN sc.completed = true THEN 1 END)::integer as completed_steps,
    CASE 
      WHEN COUNT(s.id) = 0 THEN 0
      ELSE ROUND((COUNT(CASE WHEN sc.completed = true THEN 1 END) * 100.0) / COUNT(s.id))::integer
    END as progress_percentage,
    (COUNT(s.id) > 0 AND COUNT(s.id) = COUNT(CASE WHEN sc.completed = true THEN 1 END)) as is_completed
  FROM steps s
  LEFT JOIN step_completion sc ON sc.step_id = s.id AND sc.user_id = p_user_id
  WHERE s.module_id = p_module_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get next incomplete step
CREATE OR REPLACE FUNCTION get_next_step(p_user_id uuid, p_module_id uuid)
RETURNS TABLE(
  step_id uuid,
  step_number integer,
  title text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id as step_id,
    s.step_number,
    s.title
  FROM steps s
  LEFT JOIN step_completion sc ON sc.step_id = s.id AND sc.user_id = p_user_id
  WHERE s.module_id = p_module_id
  AND (sc.completed IS NULL OR sc.completed = false)
  ORDER BY s.step_number
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==================================================
-- 9. UPDATE MODULE TABLE (OPTIONAL CLEANUP)
-- ==================================================

-- Add comment to indicate content is now in steps
COMMENT ON COLUMN modules.content IS 'DEPRECATED: Content is now stored in steps table. This column maintained for backward compatibility.';
COMMENT ON COLUMN modules.slide_pdf_url IS 'DEPRECATED: Slide PDFs are now stored per step. This column maintained for backward compatibility.';

-- ==================================================
-- 10. CREATE USEFUL VIEWS
-- ==================================================

-- View for module progress summary
CREATE VIEW module_progress_summary AS
SELECT 
  m.id as module_id,
  m.title as module_title,
  m.class_id,
  COUNT(s.id) as total_steps,
  COALESCE(
    (SELECT COUNT(*)::integer
     FROM step_completion sc2 
     JOIN steps s2 ON s2.id = sc2.step_id 
     WHERE s2.module_id = m.id 
     AND sc2.completed = true 
     AND sc2.user_id = auth.uid()), 
    0
  ) as completed_steps,
  CASE 
    WHEN COUNT(s.id) = 0 THEN 0
    ELSE ROUND((COALESCE(
      (SELECT COUNT(*)::integer
       FROM step_completion sc3 
       JOIN steps s3 ON s3.id = sc3.step_id 
       WHERE s3.module_id = m.id 
       AND sc3.completed = true 
       AND sc3.user_id = auth.uid()), 
      0
    ) * 100.0) / COUNT(s.id))::integer
  END as progress_percentage
FROM modules m
LEFT JOIN steps s ON s.module_id = m.id
GROUP BY m.id, m.title, m.class_id;

-- Enable RLS on view
ALTER VIEW module_progress_summary SET (security_barrier = true);

-- Grant usage
GRANT SELECT ON module_progress_summary TO authenticated;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Multi-step system migration completed successfully!';
  RAISE NOTICE 'Created tables: steps, step_completion, step_notes';
  RAISE NOTICE 'Migrated % existing modules to step-based system', (SELECT COUNT(*) FROM modules);
  RAISE NOTICE 'Migrated % existing notes to step notes', (SELECT COUNT(*) FROM notes);
  RAISE NOTICE 'Created % step completion records', (SELECT COUNT(*) FROM step_completion);
END $$; 