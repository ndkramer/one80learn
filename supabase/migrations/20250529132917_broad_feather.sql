/*
  # Fix RLS Policies and Syntax

  1. Changes
    - Drop all existing policies
    - Create new policies with correct syntax
    - Fix FOR INSERT UPDATE DELETE syntax error
    - Ensure proper access control
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

-- Create simple read policies for all tables
CREATE POLICY "enable_read_classes"
ON classes
FOR SELECT
TO authenticated
USING (true);

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

CREATE POLICY "enable_read_enrollments"
ON enrollments
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Create write policies for user-specific data
CREATE POLICY "enable_insert_enrollments"
ON enrollments
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "enable_update_enrollments"
ON enrollments
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "enable_delete_enrollments"
ON enrollments
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

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

-- Ensure student users have enrollments
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

-- Ensure test user has enrollments
DO $$
DECLARE
  student_id uuid;
BEGIN
  -- Get the test user's ID
  SELECT id INTO student_id 
  FROM auth.users 
  WHERE email = 'student@example.com';

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
    RAISE NOTICE 'Successfully enrolled test user % in all classes', student_id;
  ELSE
    RAISE NOTICE 'Test user not found';
  END IF;
END $$;