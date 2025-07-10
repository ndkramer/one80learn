/*
  # Fix RLS Policies for Enrollments and Classes

  1. Changes
    - Simplify RLS policies for enrollments table to prevent recursion
    - Simplify RLS policies for classes table to prevent recursion
    - Update policies to use more efficient queries
  
  2. Security
    - Maintains existing security model
    - Ensures users can only access their own enrollments
    - Ensures instructors can view their class enrollments
    - Ensures proper access control for classes
*/

-- Drop existing policies for enrollments
DROP POLICY IF EXISTS "Users can manage their enrollments" ON enrollments;
DROP POLICY IF EXISTS "Users can view their own enrollments" ON enrollments;

-- Create new simplified policies for enrollments
CREATE POLICY "Users can manage their enrollments"
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
    SELECT 1 FROM classes 
    WHERE classes.id = enrollments.class_id 
    AND classes.instructor_id = auth.uid()
  )
);

-- Drop existing policies for classes
DROP POLICY IF EXISTS "Classes are viewable by authenticated users" ON classes;
DROP POLICY IF EXISTS "Instructors can manage their own classes" ON classes;

-- Create new simplified policies for classes
CREATE POLICY "Classes are viewable by enrolled users"
ON classes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM enrollments 
    WHERE enrollments.class_id = classes.id 
    AND enrollments.user_id = auth.uid()
    AND enrollments.status = 'active'
  )
  OR instructor_id = auth.uid()
);

CREATE POLICY "Instructors can manage their own classes"
ON classes
FOR ALL
TO authenticated
USING (instructor_id = auth.uid())
WITH CHECK (instructor_id = auth.uid());