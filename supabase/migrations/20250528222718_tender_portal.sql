/*
  # Fix Admin Authentication

  1. Changes
    - Create admin_roles table
    - Add admin user to roles
    - Create RLS policies using auth.uid()
    - Add admin override policies
*/

-- Recreate admin_roles table
DROP TABLE IF EXISTS admin_roles CASCADE;
CREATE TABLE admin_roles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE admin_roles ENABLE ROW LEVEL SECURITY;

-- Add admin user
INSERT INTO admin_roles (user_id)
SELECT id FROM auth.users
WHERE email = 'Nick@one80services.com'
ON CONFLICT (user_id) DO NOTHING;

-- Create RLS policy for admin_roles
CREATE POLICY "admin_override"
ON admin_roles
FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM admin_roles
  WHERE admin_roles.user_id = auth.uid()
));

-- Create admin override policies for all tables
CREATE POLICY "admin_override"
ON classes FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM admin_roles
  WHERE admin_roles.user_id = auth.uid()
));

CREATE POLICY "admin_override"
ON enrollments FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM admin_roles
  WHERE admin_roles.user_id = auth.uid()
));

CREATE POLICY "admin_override"
ON modules FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM admin_roles
  WHERE admin_roles.user_id = auth.uid()
));

CREATE POLICY "admin_override"
ON resources FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM admin_roles
  WHERE admin_roles.user_id = auth.uid()
));

CREATE POLICY "admin_override"
ON notes FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM admin_roles
  WHERE admin_roles.user_id = auth.uid()
));

CREATE POLICY "admin_override"
ON module_progress FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM admin_roles
  WHERE admin_roles.user_id = auth.uid()
));