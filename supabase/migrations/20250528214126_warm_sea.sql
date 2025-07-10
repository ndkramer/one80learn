/*
  # Create Student User

  1. Changes
    - Create new student user with specified credentials
    - Set proper metadata and flags
    - Ensure email is confirmed
    - Set secure password hash
*/

-- Create new student user
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
  'Nick@one80labs.com',
  crypt('Admin123!', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Nick Kramer"}',
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
);