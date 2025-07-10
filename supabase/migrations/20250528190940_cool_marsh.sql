/*
  # Fix Classes RLS Policies

  1. Changes
    - Drop existing problematic policies
    - Restore working policies using auth.email()
    - Ensure proper access for admin, instructors, and students
    
  2. Security
    - Maintain data isolation
    - Allow admin full access
    - Allow instructors to manage their own classes
    - Allow authenticated users to view classes
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "admin_full_access" ON classes;
DROP POLICY IF EXISTS "authenticated_users_view_classes" ON classes;
DROP POLICY IF EXISTS "instructor_manage_own_classes" ON classes;

-- Restore working policies for classes
CREATE POLICY "admin_full_access"
ON classes
FOR ALL
TO authenticated
USING (auth.email() = 'Nick@one80services.com')
WITH CHECK (auth.email() = 'Nick@one80services.com');

CREATE POLICY "instructor_manage_own_classes"
ON classes
FOR ALL
TO authenticated
USING (instructor_id = auth.uid())
WITH CHECK (instructor_id = auth.uid());

CREATE POLICY "authenticated_users_view_classes"
ON classes
FOR SELECT
TO authenticated
USING (true);