/*
  # Fix Resources Table RLS Policies

  1. Changes
    - Remove direct user table dependency from admin policy
    - Update admin policy to use auth.jwt() -> role claim instead
    - Keep existing policies for instructors and authenticated users
    
  2. Security
    - Policies now use JWT claims instead of direct user table access
    - Maintains same level of access control but with proper permissions
*/

-- Drop existing admin policy
DROP POLICY IF EXISTS "admin_full_access" ON resources;

-- Create new admin policy using JWT claims
CREATE POLICY "admin_full_access" ON resources
  FOR ALL 
  TO authenticated
  USING (
    auth.jwt() ->> 'role' = 'admin'
  )
  WITH CHECK (
    auth.jwt() ->> 'role' = 'admin'
  );

-- Note: Other policies remain unchanged as they don't directly access the users table:
-- - enable_read_access_for_authenticated_users
-- - instructor_manage_resources