/*
  # Fix Admin Enrollments and Policies

  1. Changes
    - Drop existing policies to avoid conflicts
    - Create new simplified policies for enrollments
    - Add admin-specific policy for full access
    - Ensure admin user has enrollments for all classes
*/

-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Users can manage their enrollments" ON enrollments;
DROP POLICY IF EXISTS "Users can view their enrollments" ON enrollments;
DROP POLICY IF EXISTS "Instructors can view class enrollments" ON enrollments;
DROP POLICY IF EXISTS "admin_full_access" ON enrollments;

-- Create new simplified policies
CREATE POLICY "Users can manage their enrollments"
ON enrollments
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

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

CREATE POLICY "admin_full_access"
ON enrollments
FOR ALL
TO authenticated
USING (auth.email() = 'admin@example.com')
WITH CHECK (auth.email() = 'admin@example.com');

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