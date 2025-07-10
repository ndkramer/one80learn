/*
  # Add Admin User to admin_roles table
  
  1. Changes
    - Get user ID for nick@one80services.com
    - Insert admin role record
    - Handle case if user doesn't exist yet
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