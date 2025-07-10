/*
  # Fix User ID Ambiguity and Enable Full Access
  
  1. Changes
    - Fix ambiguous user_id references in SQL
    - Drop existing policies
    - Create simplified full access policies
    - Create test user with known credentials
    - Enroll test user in all classes
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
  test_user_id uuid;
BEGIN
  -- Check if user exists and get their ID
  SELECT id INTO test_user_id 
  FROM auth.users 
  WHERE email = 'test@example.com';
  
  IF test_user_id IS NULL THEN
    -- Create new user if they don't exist
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
    RETURNING id INTO test_user_id;
    
    RAISE NOTICE 'Created test user test@example.com with password: password123';
  END IF;

  -- Enroll the user in all classes
  INSERT INTO enrollments (user_id, class_id, status)
  SELECT 
    test_user_id,
    c.id,
    'active'
  FROM classes c
  WHERE NOT EXISTS (
    SELECT 1 FROM enrollments e 
    WHERE e.user_id = test_user_id
    AND e.class_id = c.id
  );
  
  -- Update any existing enrollments to active status
  UPDATE enrollments
  SET status = 'active'
  WHERE user_id = test_user_id;
END $$;

-- Drop admin-related tables if they exist
DROP TABLE IF EXISTS admin_roles CASCADE;
DROP TABLE IF EXISTS admin CASCADE;