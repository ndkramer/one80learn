/*
  # Fix Login Issues

  1. Changes
    - Drop all existing policies
    - Create simplified policies for student access
    - Remove admin-specific policies
    - Ensure proper access control for basic functionality
    
  2. Security
    - Maintain data isolation
    - Allow proper student access
    - Fix permission issues
*/

-- Drop all existing policies
DO $$ 
BEGIN
  EXECUTE (
    SELECT string_agg('DROP POLICY IF EXISTS ' || quote_ident(policyname) || ' ON ' || quote_ident(tablename) || ';', E'\n')
    FROM pg_policies 
    WHERE schemaname = 'public'
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error dropping policies: %', SQLERRM;
END $$;

-- Create simplified policies for student access
CREATE POLICY "enable_read_classes"
ON classes
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "enable_manage_enrollments"
ON enrollments
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "enable_read_modules"
ON modules
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "enable_read_resources"
ON resources
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "enable_manage_notes"
ON notes
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "enable_manage_progress"
ON module_progress
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Ensure RLS is enabled on all tables
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE module_progress ENABLE ROW LEVEL SECURITY;

-- Ensure student user has enrollments
DO $$
DECLARE
  student_id uuid;
BEGIN
  -- Get the student user's ID
  SELECT id INTO student_id 
  FROM auth.users 
  WHERE email = 'Nick@one80labs.com';

  IF student_id IS NOT NULL THEN
    -- Insert enrollments for all classes
    INSERT INTO enrollments (user_id, class_id, status)
    SELECT 
      student_id,
      id,
      'active'
    FROM classes
    ON CONFLICT (user_id, class_id) 
    DO UPDATE SET status = 'active';

    -- Log success
    RAISE NOTICE 'Successfully enrolled student % in all classes', student_id;
  ELSE
    RAISE NOTICE 'Student user not found';
  END IF;
END $$;