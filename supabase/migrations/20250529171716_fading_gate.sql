/*
  # Fix Admin Table RLS Policies

  1. Changes
    - Drop existing policies that might be causing permission issues
    - Create new simplified policies for admin table
    - Allow users to read only their own admin status
    - Maintain service role access for admin management
    
  2. Security
    - Ensure proper data isolation
    - Fix permission errors during login
    - Prevent unauthorized access to admin records
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read their own admin status" ON admin;
DROP POLICY IF EXISTS "Only service role can modify admin records" ON admin;

-- Create new policies
CREATE POLICY "Users can read their own admin status"
ON admin
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Only service role can modify admin records"
ON admin
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Create index for better performance if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_admin_user_id ON admin(user_id);

-- Insert test admin users for development
DO $$
DECLARE
  admin_id uuid;
  test_id uuid;
BEGIN
  -- Get the admin user's ID
  SELECT id INTO admin_id 
  FROM auth.users 
  WHERE email = 'Nick@one80services.com';

  -- Get the test user's ID
  SELECT id INTO test_id
  FROM auth.users
  WHERE email = 'test@example.com';

  -- Insert admin records
  IF admin_id IS NOT NULL THEN
    INSERT INTO admin (user_id, admin)
    VALUES (admin_id, 'Y')
    ON CONFLICT (user_id) DO UPDATE SET admin = 'Y';
  END IF;

  IF test_id IS NOT NULL THEN
    INSERT INTO admin (user_id, admin)
    VALUES (test_id, 'Y')
    ON CONFLICT (user_id) DO UPDATE SET admin = 'Y';
  END IF;
END $$;