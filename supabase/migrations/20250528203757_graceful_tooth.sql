/*
  # Fix Admin Access and Enrollments

  1. Changes
    - Drop existing policies
    - Create new simplified policies
    - Add admin access policy using auth.uid()
    - Ensure admin enrollments
    
  2. Security
    - Maintain user data isolation
    - Allow admin full access
    - Fix policy permissions
*/

-- Drop all existing policies to start fresh
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can manage their own enrollments" ON enrollments;
  DROP POLICY IF EXISTS "Users can manage their enrollments" ON enrollments;
  DROP POLICY IF EXISTS "Users can view their enrollments" ON enrollments;
  DROP POLICY IF EXISTS "Instructors can view class enrollments" ON enrollments;
  DROP POLICY IF EXISTS "admin_full_access" ON enrollments;
EXCEPTION
  WHEN others THEN NULL;
END $$;

-- Create new simplified policies
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'enrollments' 
    AND policyname = 'Users manage enrollments'
  ) THEN
    CREATE POLICY "Users manage enrollments"
    ON enrollments
    FOR ALL
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'enrollments' 
    AND policyname = 'Instructors view enrollments'
  ) THEN
    CREATE POLICY "Instructors view enrollments"
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
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'enrollments' 
    AND policyname = 'admin_full_access'
  ) THEN
    CREATE POLICY "admin_full_access"
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

-- Add indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_enrollments_user ON enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_class ON enrollments(class_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_status ON enrollments(status);

-- Ensure admin user has enrollments for all classes
DO $$ 
DECLARE
  admin_id uuid;
BEGIN
  -- Get admin user ID
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

    -- Update any existing enrollments to active status
    UPDATE enrollments
    SET status = 'active'
    WHERE user_id = admin_id;
  END IF;
END $$;