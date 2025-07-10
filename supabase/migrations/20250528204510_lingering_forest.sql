/*
  # Fix Enrollment RLS Policies

  1. Changes
    - Drop existing policies that might cause recursion
    - Create new simplified policies for enrollments
    - Use auth.email() for admin checks
    - Avoid circular dependencies

  2. Security
    - Maintain user data isolation
    - Allow proper access control
    - Fix infinite recursion
*/

-- Drop existing policies to start fresh
DROP POLICY IF EXISTS "admin_manage_all_enrollments" ON enrollments;
DROP POLICY IF EXISTS "instructors_view_class_enrollments" ON enrollments;
DROP POLICY IF EXISTS "students_manage_own_enrollments" ON enrollments;
DROP POLICY IF EXISTS "students_view_own_enrollments" ON enrollments;

-- Create new, simplified policies
CREATE POLICY "admin_manage_enrollments"
ON enrollments
FOR ALL
TO authenticated
USING (auth.email() = 'Nick@one80services.com')
WITH CHECK (auth.email() = 'Nick@one80services.com');

CREATE POLICY "students_manage_enrollments"
ON enrollments
FOR ALL
TO authenticated
USING (
  user_id = auth.uid()
)
WITH CHECK (
  user_id = auth.uid()
);

CREATE POLICY "instructors_view_enrollments"
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