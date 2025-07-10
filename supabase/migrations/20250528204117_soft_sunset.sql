/*
  # Fix Enrollments Policies

  1. Changes
    - Drop existing problematic policies
    - Create new simplified policies
    - Fix admin policy to use auth.users
    - Add proper student and instructor policies

  2. Security
    - Maintain data isolation
    - Allow proper access control
    - Fix admin access check
*/

-- Drop existing policies that might cause recursion
DROP POLICY IF EXISTS "admin_full_access" ON enrollments;
DROP POLICY IF EXISTS "manage_own_enrollments" ON enrollments;
DROP POLICY IF EXISTS "view_own_enrollments" ON enrollments;

-- Create new simplified policies
CREATE POLICY "students_view_own_enrollments"
ON enrollments
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
);

CREATE POLICY "instructors_view_class_enrollments"
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

CREATE POLICY "students_manage_own_enrollments"
ON enrollments
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "admin_manage_all_enrollments"
ON enrollments
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.email = 'Nick@one80services.com'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.email = 'Nick@one80services.com'
  )
);