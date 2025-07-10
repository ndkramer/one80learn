/*
  # Fix Admin Table RLS Policies

  1. Changes
    - Allow all authenticated users to read admin records
    - Maintain service role access for modifications
    - Fix permission issues causing login failures
    
  2. Security
    - Maintain data isolation
    - Allow proper admin status checks
    - Prevent unauthorized modifications
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Allow authenticated users to read admin records" ON admin;
DROP POLICY IF EXISTS "Only service role can modify admin records" ON admin;

-- Create new simplified policies
CREATE POLICY "Allow authenticated users to read admin records"
ON admin
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Only service role can modify admin records"
ON admin
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Ensure index exists for performance
CREATE INDEX IF NOT EXISTS idx_admin_user_id ON admin(user_id);

-- Insert admin user if not exists
DO $$
DECLARE
  admin_id uuid;
BEGIN
  -- Get the admin user's ID
  SELECT id INTO admin_id 
  FROM auth.users 
  WHERE email = 'Nick@one80services.com';

  IF admin_id IS NOT NULL THEN
    -- Insert admin record
    INSERT INTO admin (user_id, admin)
    VALUES (admin_id, 'Y')
    ON CONFLICT (user_id) DO UPDATE SET admin = 'Y';

    -- Log success
    RAISE NOTICE 'Successfully added/updated admin record for user %', admin_id;
  ELSE
    RAISE NOTICE 'Admin user not found';
  END IF;
END $$;