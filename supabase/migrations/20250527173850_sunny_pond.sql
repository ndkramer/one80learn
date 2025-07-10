/*
  # Fix RLS Policy Recursion

  1. Changes
    - Drop problematic policies causing infinite recursion
    - Create simplified policies without circular references
    - Fix enrollment and class access checks
    
  2. Security
    - Maintain data isolation
    - Preserve access control rules
    - Prevent unauthorized access
*/

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Classes are viewable by authenticated" ON classes;
DROP POLICY IF EXISTS "Classes are viewable by everyone" ON classes;
DROP POLICY IF EXISTS "Instructors can manage their own classes" ON classes;
DROP POLICY IF EXISTS "Students can access enrolled classes" ON classes;
DROP POLICY IF EXISTS "Users can view enrolled class details" ON classes;

DROP POLICY IF EXISTS "Users can manage enrollments" ON enrollments;
DROP POLICY IF EXISTS "Users can view their own enrollments" ON enrollments;
DROP POLICY IF EXISTS "Instructors can view enrollments" ON enrollments;
DROP POLICY IF EXISTS "Users can view their enrollments with class details" ON enrollments;

-- Create simplified class policies
CREATE POLICY "view_classes"
ON classes FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "manage_own_classes"
ON classes FOR ALL
TO authenticated
USING (instructor_id = auth.uid())
WITH CHECK (instructor_id = auth.uid());

-- Create simplified enrollment policies
CREATE POLICY "manage_own_enrollments"
ON enrollments FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "view_class_enrollments"
ON enrollments FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM classes
    WHERE id = enrollments.class_id
    AND instructor_id = auth.uid()
  )
);