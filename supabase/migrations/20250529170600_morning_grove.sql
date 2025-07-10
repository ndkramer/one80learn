/*
  # Create Admin Table
  
  1. New Tables
    - `admin`
      - `user_id` (uuid, primary key, references auth.users)
      - `admin` (text, Y/N value)
      
  2. Security
    - Enable RLS
    - Add policies for admin access
    - Ensure proper data isolation
*/

-- Create admin table
CREATE TABLE IF NOT EXISTS admin (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  admin text NOT NULL CHECK (admin IN ('Y', 'N')),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE admin ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for admin users
CREATE POLICY "Admin users can view admin table"
ON admin
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admin
    WHERE admin.user_id = auth.uid()
    AND admin.admin = 'Y'
  )
);

-- Create RLS policy for admin users to manage the admin table
CREATE POLICY "Admin users can manage admin table"
ON admin
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admin
    WHERE admin.user_id = auth.uid()
    AND admin.admin = 'Y'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM admin
    WHERE admin.user_id = auth.uid()
    AND admin.admin = 'Y'
  )
);

-- Add index for better performance
CREATE INDEX idx_admin_user_id ON admin(user_id);

-- Insert initial admin user if Nick@one80services.com exists
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
    ON CONFLICT (user_id) DO NOTHING;

    -- Log success
    RAISE NOTICE 'Successfully added admin record for user %', admin_id;
  ELSE
    RAISE NOTICE 'Admin user not found';
  END IF;
END $$;