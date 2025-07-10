/*
  # Fix infinite recursion in classes RLS policies

  1. Changes
    - Remove existing RLS policies that cause recursion
    - Create new, optimized policies for the classes table:
      - Admin full access based on email check only
      - Instructor access based on direct instructor_id check
      - Student access based on direct enrollment check without recursive joins
  
  2. Security
    - Maintains RLS protection
    - Simplifies policy conditions to prevent recursion
    - Preserves existing access patterns but implements them more efficiently
*/

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "admin_full_access" ON classes;
DROP POLICY IF EXISTS "instructors_manage_own_courses" ON classes;
DROP POLICY IF EXISTS "students_view_enrolled_courses" ON classes;

-- Create new, optimized policies
CREATE POLICY "admin_full_access"
ON classes
FOR ALL
TO authenticated
USING (
  (SELECT email FROM auth.users WHERE auth.users.id = auth.uid()) = 'Nick@one80services.com'
)
WITH CHECK (
  (SELECT email FROM auth.users WHERE auth.users.id = auth.uid()) = 'Nick@one80services.com'
);

-- Instructors can manage their own courses
CREATE POLICY "instructors_manage_own_courses"
ON classes
FOR ALL
TO authenticated
USING (instructor_id = auth.uid())
WITH CHECK (instructor_id = auth.uid());

-- Students can view courses they're enrolled in
CREATE POLICY "students_view_enrolled_courses"
ON classes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM enrollments 
    WHERE 
      enrollments.class_id = classes.id 
      AND enrollments.user_id = auth.uid() 
      AND enrollments.status = 'active'
  )
);