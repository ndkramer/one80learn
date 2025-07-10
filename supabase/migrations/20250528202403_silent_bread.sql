/*
  # Fix Admin Enrollments and Policies

  1. Changes
    - Drop and recreate policies only if they don't exist
    - Ensure admin user is enrolled in all classes
    - Add performance optimizations
    
  2. Security
    - Maintain existing access control
    - Add admin-specific policies
*/

-- Only create policies if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'enrollments' 
    AND policyname = 'Users can manage their own enrollments'
  ) THEN
    CREATE POLICY "Users can manage their own enrollments"
    ON enrollments
    FOR ALL
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
    ON enrollments
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM classes
        WHERE classes.id = enrollments.class_id
        AND classes.instructor_id = auth.uid()
      )
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'enrollments' 
    AND policyname = 'admin_full_access'
  ) THEN
    CREATE POLICY "admin_full_access"
    ON enrollments
    FOR ALL
    TO authenticated
    USING (auth.email() = 'admin@example.com')
    WITH CHECK (auth.email() = 'admin@example.com');
  END IF;
END $$;

-- Ensure admin user has enrollments for all classes
DO $$
DECLARE
  admin_id uuid;
BEGIN
  -- Get the admin user's ID
  SELECT id INTO admin_id 
  FROM auth.users 
  WHERE email = 'admin@example.com';

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

    -- Ensure all existing enrollments are active
    UPDATE enrollments
    SET status = 'active'
    WHERE user_id = admin_id;
  END IF;
END $$;

-- Add indexes if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'enrollments' 
    AND indexname = 'idx_enrollments_user'
  ) THEN
    CREATE INDEX idx_enrollments_user ON enrollments(user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'enrollments' 
    AND indexname = 'idx_enrollments_class'
  ) THEN
    CREATE INDEX idx_enrollments_class ON enrollments(class_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'enrollments' 
    AND indexname = 'idx_enrollments_status'
  ) THEN
    CREATE INDEX idx_enrollments_status ON enrollments(status);
  END IF;
END $$;

-- Add unique constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'enrollments_user_id_class_id_key'
  ) THEN
    ALTER TABLE enrollments
    ADD CONSTRAINT enrollments_user_id_class_id_key 
    UNIQUE (user_id, class_id);
  END IF;
END $$;