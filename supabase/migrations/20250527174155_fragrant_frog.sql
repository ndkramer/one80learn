/*
  # Fix Admin Access and Enrollments

  1. Changes
    - Ensure admin user is enrolled in all classes
    - Update existing enrollments to active status
    - Add admin-specific policies if they don't exist

  2. Security
    - Maintain admin access to all resources
    - Handle existing policy cases
*/

-- First, ensure admin user exists and get their ID
DO $$
DECLARE
  admin_id uuid;
BEGIN
  -- Get the admin user's ID
  SELECT id INTO admin_id FROM auth.users WHERE email = 'admin@example.com';

  -- If admin exists, ensure they're enrolled in all classes
  IF admin_id IS NOT NULL THEN
    -- Insert enrollments for any missing classes
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

    -- Update any existing enrollments to active status
    UPDATE enrollments
    SET status = 'active'
    WHERE user_id = admin_id;
  END IF;
END $$;

-- Add admin-specific policies if they don't exist
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy 
    WHERE polname = 'Admin can manage all classes'
    AND polrelid = 'classes'::regclass
  ) THEN
    CREATE POLICY "Admin can manage all classes"
    ON classes
    FOR ALL
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM auth.users
        WHERE auth.users.id = auth.uid()
        AND auth.users.email = 'admin@example.com'
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM auth.users
        WHERE auth.users.id = auth.uid()
        AND auth.users.email = 'admin@example.com'
      )
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policy 
    WHERE polname = 'Admin can manage all enrollments'
    AND polrelid = 'enrollments'::regclass
  ) THEN
    CREATE POLICY "Admin can manage all enrollments"
    ON enrollments
    FOR ALL
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM auth.users
        WHERE auth.users.id = auth.uid()
        AND auth.users.email = 'admin@example.com'
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM auth.users
        WHERE auth.users.id = auth.uid()
        AND auth.users.email = 'admin@example.com'
      )
    );
  END IF;
END $$;