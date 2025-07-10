/*
  # Fix Admin Access and Enrollments

  1. Changes
    - Ensure admin user has enrollments for all classes
    - Update RLS policies to allow proper access
    - Fix enrollment status for admin user

  2. Security
    - Maintain existing security model
    - Add specific policies for admin access
*/

-- First, ensure admin user has enrollments for all classes
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

-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Users can manage their enrollments" ON enrollments;
DROP POLICY IF EXISTS "Users can view their own enrollments" ON enrollments;
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

CREATE POLICY "Admin full access"
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