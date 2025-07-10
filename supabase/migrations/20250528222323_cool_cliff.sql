/*
  # Add Admin Role for Nick

  1. Changes
    - Add Nick@one80services.com to admin_roles table
    - Ensure user exists before adding role
    - Add proper RLS policy for admin access
*/

-- Add Nick to admin_roles table
INSERT INTO admin_roles (user_id)
SELECT id
FROM auth.users
WHERE email = 'Nick@one80services.com'
ON CONFLICT (user_id) DO NOTHING;

-- Create admin override policy
CREATE POLICY "admin_override"
ON admin_roles
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admin_roles
    WHERE admin_roles.user_id = auth.uid()
  )
);