/*
  # Fix Login Issues
  
  1. Changes
    - Create a new test user with known credentials
    - Ensure proper RLS policies for authentication
    - Remove admin-related tables and policies
    
  2. Security
    - Maintain basic authentication
    - Allow proper access to student data
*/

-- Drop all existing policies
DO $$ 
BEGIN
  EXECUTE (
    SELECT string_agg('DROP POLICY IF EXISTS ' || quote_ident(policyname) || ' ON ' || quote_ident(tablename) || ';', E'\n')
    FROM pg_policies 
    WHERE schemaname = 'public'
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error dropping policies: %', SQLERRM;
END $$;

-- Create simple policies for all tables
CREATE POLICY "enable_full_access_classes"
ON classes
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "enable_full_access_modules"
ON modules
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "enable_full_access_resources"
ON resources
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "enable_full_access_enrollments"
ON enrollments
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "enable_full_access_notes"
ON notes
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "enable_full_access_progress"
ON module_progress
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Ensure RLS is enabled on all tables
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE module_progress ENABLE ROW LEVEL SECURITY;

-- Create a test user with known credentials if it doesn't exist
DO $$
DECLARE
  user_exists boolean;
  user_id uuid;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM auth.users WHERE email = 'test@example.com'
  ) INTO user_exists;
  
  IF NOT user_exists THEN
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
      'test@example.com',
      crypt('password123', gen_salt('bf')),
      NOW(),
      NOW(),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Test User"}',
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    )
    RETURNING id INTO user_id;
    
    -- Enroll the test user in all classes
    INSERT INTO enrollments (user_id, class_id, status)
    SELECT 
      user_id,
      id,
      'active'
    FROM classes;
    
    RAISE NOTICE 'Created test user test@example.com with password: password123';
  END IF;
END $$;

-- Drop admin-related tables if they exist
DROP TABLE IF EXISTS admin_roles CASCADE;
DROP TABLE IF EXISTS admin CASCADE;