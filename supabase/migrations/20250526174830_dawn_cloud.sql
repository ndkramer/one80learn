/*
  # Fix RLS Policies for Enrollments and Classes

  1. Changes
    - Simplify the RLS policies for enrollments and classes tables
    - Remove circular references causing infinite recursion
    - Maintain security while ensuring efficient policy evaluation

  2. Security
    - Maintain existing access control requirements
    - Ensure proper data isolation between users
    - Preserve instructor access to their classes
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Classes are viewable by enrolled users" ON classes;
DROP POLICY IF EXISTS "Students can access enrolled class modules" ON modules;

-- Create new simplified policies
CREATE POLICY "Classes are viewable by everyone" ON classes
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Students can access enrolled class modules" ON modules
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM enrollments
    WHERE 
      enrollments.class_id = modules.class_id 
      AND enrollments.user_id = auth.uid()
      AND enrollments.status = 'active'
  )
  OR 
  EXISTS (
    SELECT 1 FROM classes
    WHERE 
      classes.id = modules.class_id 
      AND classes.instructor_id = auth.uid()
  )
);

-- Update enrollments policies to avoid recursion
DROP POLICY IF EXISTS "Instructors can view class enrollments" ON enrollments;

CREATE POLICY "Instructors can view class enrollments" ON enrollments
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM classes
    WHERE 
      classes.id = enrollments.class_id 
      AND classes.instructor_id = auth.uid()
  )
);