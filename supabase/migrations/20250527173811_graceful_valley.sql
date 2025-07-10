/*
  # Fix RLS Policy Conflicts

  1. Changes
    - Drop all existing policies before recreating
    - Simplify access control
    - Fix infinite recursion issues
    - Ensure proper instructor access

  2. Security
    - Maintain data isolation
    - Allow proper class visibility
    - Control enrollment access
*/

-- Drop ALL existing policies to ensure clean slate
DROP POLICY IF EXISTS "Classes are viewable by everyone" ON classes;
DROP POLICY IF EXISTS "Classes are viewable by authenticated users" ON classes;
DROP POLICY IF EXISTS "Classes are viewable by enrolled users" ON classes;
DROP POLICY IF EXISTS "Instructors can manage their own classes" ON classes;
DROP POLICY IF EXISTS "Users can view their enrollments" ON enrollments;
DROP POLICY IF EXISTS "Users can manage their own enrollments" ON enrollments;
DROP POLICY IF EXISTS "Instructors can view enrollments" ON enrollments;
DROP POLICY IF EXISTS "Instructors can view class enrollments" ON enrollments;

-- Create new simplified policies for classes
CREATE POLICY "Classes are viewable by authenticated"
ON classes FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Instructors manage classes"
ON classes FOR ALL
TO authenticated
USING (instructor_id = auth.uid())
WITH CHECK (instructor_id = auth.uid());

-- Create new simplified policies for enrollments
CREATE POLICY "Users manage enrollments"
ON enrollments FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Instructors view enrollments"
ON enrollments FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM classes
    WHERE classes.id = enrollments.class_id
    AND classes.instructor_id = auth.uid()
  )
);