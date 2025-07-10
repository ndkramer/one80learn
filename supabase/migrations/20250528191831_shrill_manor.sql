/*
  # Fix Classes RLS Policies

  1. Changes
    - Drop existing policies
    - Create simplified view policy for authenticated users
    - Create admin access policy using correct auth.email() function

  2. Security
    - Allow all authenticated users to view classes
    - Grant full access to admin user
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
USING (auth.email() = 'Nick@one80services.com')
WITH CHECK (auth.email() = 'Nick@one80services.com');