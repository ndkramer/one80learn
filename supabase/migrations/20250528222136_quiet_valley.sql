/*
  # Add Admin User to admin_roles Table

  1. Changes
    - Add Nick@one80services.com as admin user
    - Handle case where user doesn't exist yet
    - Ensure idempotent operation
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