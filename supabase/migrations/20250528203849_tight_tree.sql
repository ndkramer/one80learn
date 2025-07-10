/*
  # Fix RLS policies for user access

  1. Changes
    - Remove direct references to auth.users table
    - Update policies to use auth.uid() for user identification
    - Ensure proper access for both students and instructors
    
  2. Security
    - Modify RLS policies for enrollments and module_progress tables
    - Use auth.uid() instead of direct user table references
    - Maintain existing security model while fixing permission issues
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Instructors view enrollments" ON enrollments;
DROP POLICY IF EXISTS "Users manage enrollments" ON enrollments;
DROP POLICY IF EXISTS "Instructors can view student progress" ON module_progress;
DROP POLICY IF EXISTS "Users can manage their own progress" ON module_progress;

-- Create new policies for enrollments
CREATE POLICY "view_own_enrollments"
ON enrollments
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM classes 
    WHERE classes.id = enrollments.class_id 
    AND classes.instructor_id = auth.uid()
  )
);

CREATE POLICY "manage_own_enrollments"
ON enrollments
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Create new policies for module_progress
CREATE POLICY "view_module_progress"
ON module_progress
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM modules m
    JOIN classes c ON c.id = m.class_id
    WHERE m.id = module_progress.module_id 
    AND c.instructor_id = auth.uid()
  )
);

CREATE POLICY "manage_own_progress"
ON module_progress
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());