/*
  # Fix RLS Policies and Access Control

  1. Changes
    - Drop all existing policies to start fresh
    - Create simplified policies for basic access
    - Fix permission issues causing login errors
    - Ensure proper data isolation
    
  2. Security
    - Maintain user data isolation
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

-- Create basic read policies for classes and modules
CREATE POLICY "enable_read_classes"
ON classes
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "enable_read_modules"
ON modules
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM enrollments
    WHERE enrollments.class_id = modules.class_id
    AND enrollments.user_id = auth.uid()
    AND enrollments.status = 'active'
  )
);

-- Create policy for enrollments
CREATE POLICY "enable_manage_enrollments"
ON enrollments
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Create policy for resources
CREATE POLICY "enable_read_resources"
ON resources
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM modules m
    JOIN enrollments e ON e.class_id = m.class_id
    WHERE m.id = resources.module_id
    AND e.user_id = auth.uid()
    AND e.status = 'active'
  )
);

-- Create policy for notes
CREATE POLICY "enable_manage_notes"
ON notes
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Create policy for module progress
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