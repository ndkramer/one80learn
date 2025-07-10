/*
  # Fix Admin Table RLS Policies

  1. Changes
    - Drop existing RLS policies for admin table
    - Create new policy allowing users to read only their own admin record
    - Maintain service role access for admin management
    - Add admin records for test users

  2. Security
    - Restrict users to only see their own admin status
    - Prevent permission errors when querying admin table
    - Maintain service role capabilities
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Allow authenticated users to read admin records" ON admin;
DROP POLICY IF EXISTS "Only service role can modify admin records" ON admin;

-- Create new policies
CREATE POLICY "Allow authenticated users to read admin records"
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

-- Ensure index exists for performance
CREATE INDEX IF NOT EXISTS idx_admin_user_id ON admin(user_id);

-- Insert admin users if they don't exist
DO $$
DECLARE
  admin_id uuid;
  test_id uuid;
BEGIN
  -- Get Nick@one80services.com user ID
  SELECT id INTO admin_id 
  FROM auth.users 
  WHERE email = 'Nick@one80services.com';

  -- Get test@example.com user ID
  SELECT id INTO test_id
  FROM auth.users
  WHERE email = 'test@example.com';

  -- Insert admin records
  IF admin_id IS NOT NULL THEN
    INSERT INTO admin (user_id, admin)
    VALUES (admin_id, 'Y')
    ON CONFLICT (user_id) DO UPDATE SET admin = 'Y';
    
    RAISE NOTICE 'Added/updated admin record for Nick@one80services.com';
  END IF;

  IF test_id IS NOT NULL THEN
    INSERT INTO admin (user_id, admin)
    VALUES (test_id, 'Y')
    ON CONFLICT (user_id) DO UPDATE SET admin = 'Y';
    
    RAISE NOTICE 'Added/updated admin record for test@example.com';
  END IF;
END $$;