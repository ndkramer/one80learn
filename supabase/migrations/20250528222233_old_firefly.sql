/*
  # Add Admin Role for Nick@one80services.com
  
  1. Changes
    - Get user ID for Nick@one80services.com
    - Add admin role entry
    - Handle case where role already exists
    
  2. Security
    - Maintains existing security model
    - Adds proper admin access
*/

-- Get user ID and insert admin role
DO $$
DECLARE
  admin_id uuid;
BEGIN
  -- Get the admin user's ID
  SELECT id INTO admin_id 
  FROM auth.users 
  WHERE email = 'Nick@one80services.com';

  IF admin_id IS NOT NULL THEN
    -- Insert admin role
    INSERT INTO admin_roles (user_id)
    VALUES (admin_id)
    ON CONFLICT (user_id) DO NOTHING;

    -- Log success
    RAISE NOTICE 'Successfully added admin role for user %', admin_id;
  ELSE
    RAISE NOTICE 'Admin user not found';
  END IF;
END $$;