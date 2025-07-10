/*
  # Fix RLS policies for module progress and enrollments

  1. Changes
    - Drop and recreate policies for module_progress table
    - Drop and recreate policies for enrollments table
    - Remove direct users table checks from policies
    - Use auth.uid() for user verification
    
  2. Security
    - Ensure users can only access their own data
    - Allow instructors to view student progress
    - Remove dependency on direct users table access
*/

-- Drop existing policies for module_progress
DROP POLICY IF EXISTS "Admin can view all progress" ON module_progress;
DROP POLICY IF EXISTS "Instructors can view student progress" ON module_progress;
DROP POLICY IF EXISTS "Users can manage their own progress" ON module_progress;
DROP POLICY IF EXISTS "Users can view their own progress" ON module_progress;
DROP POLICY IF EXISTS "manage_own_progress" ON module_progress;
DROP POLICY IF EXISTS "view_own_progress" ON module_progress;

-- Create new policies for module_progress
CREATE POLICY "Users can manage their own progress"
ON module_progress
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Instructors can view student progress"
ON module_progress
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM modules m
    JOIN classes c ON c.id = m.class_id
    WHERE m.id = module_progress.module_id
    AND c.instructor_id = auth.uid()
  )
);

-- Drop existing policies for enrollments
DROP POLICY IF EXISTS "Admin can manage all enrollments" ON enrollments;
DROP POLICY IF EXISTS "Instructors view enrollments" ON enrollments;
DROP POLICY IF EXISTS "Users manage enrollments" ON enrollments;
DROP POLICY IF EXISTS "manage_own_enrollments" ON enrollments;
DROP POLICY IF EXISTS "view_class_enrollments" ON enrollments;
DROP POLICY IF EXISTS "view_own_enrollments" ON enrollments;

-- Create new policies for enrollments
CREATE POLICY "Users can manage their own enrollments"
ON enrollments
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Instructors can view class enrollments"
ON enrollments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM classes
    WHERE classes.id = enrollments.class_id
    AND classes.instructor_id = auth.uid()
  )
);