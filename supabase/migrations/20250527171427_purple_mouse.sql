/*
  # Create Admin User

  1. Changes
    - Create admin user with email Nick@one80services.com
    - Set secure password
    - Add user metadata
    - Ensure idempotent execution

  2. Security
    - Password is securely hashed
    - Email is case-sensitive
    - User is automatically confirmed
*/

DO $$
DECLARE
  new_user_id uuid;
BEGIN
  -- Only create if user doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM auth.users WHERE email = 'Nick@one80services.com'
  ) THEN
    -- Create the admin user
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      recovery_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'Nick@one80services.com',
      crypt('AdminOne80!', gen_salt('bf')),
      NOW(),
      NOW(),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{"name":"Nick Kramer", "role": "admin"}',
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    )
    RETURNING id INTO new_user_id;

    -- Enroll admin in all existing classes
    INSERT INTO enrollments (user_id, class_id, status)
    SELECT 
      new_user_id,
      id,
      'active'
    FROM classes;
  END IF;
END $$;