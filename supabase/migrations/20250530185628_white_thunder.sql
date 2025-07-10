/*
  # Add super admin functionality
  
  1. Changes
    - Adds function to check if a user is a super admin
    - Adds function to set super admin status
    - Adds function to remove super admin status
    - Sets initial test user as super admin
*/

-- Create helper functions in public schema for better accessibility
CREATE OR REPLACE FUNCTION public.check_is_super_admin(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = user_id 
    AND raw_user_meta_data->>'is_super_admin' = 'true'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.set_user_super_admin(user_id uuid, is_admin boolean)
RETURNS void AS $$
BEGIN
  UPDATE auth.users SET raw_user_meta_data = 
    COALESCE(raw_user_meta_data, '{}'::jsonb) || 
    jsonb_build_object('is_super_admin', is_admin)
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Set initial super admin
UPDATE auth.users 
SET raw_user_meta_data = 
  COALESCE(raw_user_meta_data, '{}'::jsonb) || 
  jsonb_build_object('is_super_admin', true)
WHERE email = 'test@example.com';