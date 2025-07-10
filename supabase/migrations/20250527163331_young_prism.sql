/*
  # Fix admin_users RLS policy

  1. Changes
    - Drop the existing policy that causes infinite recursion
    - Create a new policy that directly checks the user ID without querying the table again
  
  2. Security
    - Maintains RLS protection
    - Only allows admin users to view the admin_users table
    - Uses direct ID comparison instead of subquery
*/

-- Drop the existing policy that causes recursion
DROP POLICY IF EXISTS "Admin users can view admin_users" ON admin_users;

-- Create new policy that avoids recursion by directly checking the ID
CREATE POLICY "Admin users can view admin_users"
ON admin_users
FOR SELECT
TO authenticated
USING (id = auth.uid());