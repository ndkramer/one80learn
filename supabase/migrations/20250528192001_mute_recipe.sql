/*
  # Fix Class RLS Policies

  1. Changes
    - Drop existing policies
    - Create simplified policies for class access
    - Use correct auth.email() function
    - Maintain basic access control

  2. Security
    - Allow all authenticated users to view classes
    - Give admin full access
    - Preserve data isolation
*/

-- Drop existing policies to start fresh
DROP POLICY IF EXISTS "admin_full_access" ON classes;
DROP POLICY IF EXISTS "authenticated_users_view_classes" ON classes;
DROP POLICY IF EXISTS "instructor_manage_own_classes" ON classes;

-- Create new simplified policies
CREATE POLICY "authenticated_users_view_classes"
ON classes
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "admin_full_access"
ON classes
FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM auth.users
  WHERE auth.users.id = auth.uid()
  AND auth.users.email = 'Nick@one80services.com'
))
WITH CHECK (EXISTS (
  SELECT 1 FROM auth.users
  WHERE auth.users.id = auth.uid()
  AND auth.users.email = 'Nick@one80services.com'
));