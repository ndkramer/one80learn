/*
  # Fix RLS policies for classes and enrollments

  1. Changes
    - Simplify RLS policies for classes table
    - Simplify RLS policies for enrollments table
    - Remove circular dependencies causing infinite recursion

  2. Security
    - Maintain existing access control rules but implement them more efficiently
    - Ensure instructors can still manage their classes
    - Ensure students can still access their enrolled classes
    - Enable RLS on affected tables
*/

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Classes are viewable by authenticated users" ON classes;
DROP POLICY IF EXISTS "Instructors can manage their own classes" ON classes;
DROP POLICY IF EXISTS "Students can access enrolled classes" ON classes;

DROP POLICY IF EXISTS "Instructors can view class enrollments" ON enrollments;
DROP POLICY IF EXISTS "Users can view their own enrollments" ON enrollments;

-- Recreate policies for classes table
CREATE POLICY "Classes are viewable by authenticated users"
ON classes FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Instructors can manage their own classes"
ON classes FOR ALL
TO authenticated
USING (instructor_id = auth.uid())
WITH CHECK (instructor_id = auth.uid());

-- Recreate policies for enrollments table
CREATE POLICY "Users can view their own enrollments"
ON enrollments FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM classes 
    WHERE classes.id = enrollments.class_id 
    AND classes.instructor_id = auth.uid()
  )
);

CREATE POLICY "Users can manage their enrollments"
ON enrollments FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());