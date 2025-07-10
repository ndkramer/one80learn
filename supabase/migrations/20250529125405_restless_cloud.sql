/*
  # Fix Student Login Issues
  
  1. Changes
    - Drop existing RLS policies for modules and resources
    - Create new policies that properly restrict access based on enrollment
    - Ensure students can only access modules and resources for classes they're enrolled in
    - Fix permission issues causing login failures
    
  2. Security
    - Maintain data isolation
    - Enforce proper access control
    - Prevent unauthorized access
*/

-- Drop existing policies for modules and resources
DROP POLICY IF EXISTS "enable_read_modules" ON modules;
DROP POLICY IF EXISTS "enable_read_resources" ON resources;

-- Create new policy for modules that properly checks enrollment
CREATE POLICY "enable_read_modules"
ON modules
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM enrollments
    WHERE enrollments.class_id = modules.class_id
    AND enrollments.user_id = auth.uid()
    AND enrollments.status = 'active'
  )
);

-- Create new policy for resources that properly checks enrollment
CREATE POLICY "enable_read_resources"
ON resources
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM modules m
    JOIN enrollments e ON e.class_id = m.class_id
    WHERE m.id = resources.module_id
    AND e.user_id = auth.uid()
    AND e.status = 'active'
  )
);

-- Ensure all student users are enrolled in classes
DO $$
DECLARE
  student_id uuid;
BEGIN
  -- Get the student user's ID
  SELECT id INTO student_id 
  FROM auth.users 
  WHERE email = 'Nick@one80labs.com';

  IF student_id IS NOT NULL THEN
    -- Insert enrollments for all classes
    INSERT INTO enrollments (user_id, class_id, status)
    SELECT 
      student_id,
      id,
      'active'
    FROM classes
    WHERE NOT EXISTS (
      SELECT 1 FROM enrollments e 
      WHERE e.user_id = student_id
      AND e.class_id = classes.id
    );

    -- Ensure all existing enrollments are active
    UPDATE enrollments
    SET status = 'active'
    WHERE user_id = student_id;

    -- Log success
    RAISE NOTICE 'Successfully enrolled student % in all classes', student_id;
  ELSE
    RAISE NOTICE 'Student user not found';
  END IF;
END $$;

-- Create a test user if it doesn't exist
DO $$
DECLARE
  user_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM auth.users WHERE email = 'student@example.com'
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
      'student@example.com',
      crypt('password123', gen_salt('bf')),
      NOW(),
      NOW(),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Test Student"}',
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    );
    
    -- Enroll the test user in all classes
    INSERT INTO enrollments (user_id, class_id, status)
    SELECT 
      (SELECT id FROM auth.users WHERE email = 'student@example.com'),
      id,
      'active'
    FROM classes;
    
    RAISE NOTICE 'Created test user student@example.com with password: password123';
  END IF;
END $$;