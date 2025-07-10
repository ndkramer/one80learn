/*
  # Fix Admin User Enrollments and Policies

  1. Changes
    - Drop existing complex policies
    - Create simplified policies if they don't exist
    - Ensure admin user has proper enrollments
    - Add logging for debugging

  2. Security
    - Maintain basic access control
    - Ensure admin access to all classes
    - Simplify policy structure
*/

-- Drop existing complex policies
DROP POLICY IF EXISTS "Admin can access all data" ON classes;
DROP POLICY IF EXISTS "view_all_classes" ON classes;
DROP POLICY IF EXISTS "manage_own_classes" ON classes;
DROP POLICY IF EXISTS "view_own_enrollments" ON enrollments;
DROP POLICY IF EXISTS "manage_own_enrollments" ON enrollments;
DROP POLICY IF EXISTS "view_class_enrollments" ON enrollments;

-- Create simplified class policies with existence checks
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'classes' 
    AND policyname = 'Classes are viewable by authenticated users'
  ) THEN
    CREATE POLICY "Classes are viewable by authenticated users"
    ON classes FOR SELECT
    TO authenticated
    USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'classes' 
    AND policyname = 'Instructors manage classes'
  ) THEN
    CREATE POLICY "Instructors manage classes"
    ON classes FOR ALL
    TO authenticated
    USING (instructor_id = auth.uid())
    WITH CHECK (instructor_id = auth.uid());
  END IF;
END $$;

-- Create simplified enrollment policies with existence checks
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'enrollments' 
    AND policyname = 'Users can manage their own enrollments'
  ) THEN
    CREATE POLICY "Users can manage their own enrollments"
    ON enrollments FOR ALL
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'enrollments' 
    AND policyname = 'Instructors can view class enrollments'
  ) THEN
    CREATE POLICY "Instructors can view class enrollments"
    ON enrollments FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM classes
        WHERE classes.id = enrollments.class_id
        AND classes.instructor_id = auth.uid()
      )
    );
  END IF;
END $$;

-- Ensure admin user exists and has enrollments
DO $$
DECLARE
  admin_id uuid;
BEGIN
  -- Get admin user ID
  SELECT id INTO admin_id 
  FROM auth.users 
  WHERE email = 'admin@example.com';

  -- Log for debugging
  RAISE NOTICE 'Admin user ID: %', admin_id;

  IF admin_id IS NOT NULL THEN
    -- Enroll admin in all classes
    INSERT INTO enrollments (user_id, class_id, status)
    SELECT 
      admin_id,
      c.id,
      'active'
    FROM classes c
    WHERE NOT EXISTS (
      SELECT 1 FROM enrollments e 
      WHERE e.user_id = admin_id
      AND e.class_id = c.id
    );

    -- Ensure all enrollments are active
    UPDATE enrollments
    SET status = 'active'
    WHERE user_id = admin_id;

    -- Log enrollment count
    RAISE NOTICE 'Updated enrollments for admin user';
  ELSE
    RAISE NOTICE 'Admin user not found';
  END IF;
END $$;