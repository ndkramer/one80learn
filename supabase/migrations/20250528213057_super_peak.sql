/*
  # Fix Enrollment Access Policies

  1. Changes
    - Simplify RLS policies for enrollments
    - Fix access control for enrolled classes
    - Ensure proper student access to classes
    - Remove unnecessary complexity

  2. Security
    - Maintain data isolation
    - Allow students to view their enrolled classes
    - Preserve instructor access where needed
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "enable_enrollment_access" ON enrollments;
DROP POLICY IF EXISTS "enable_class_access" ON classes;

-- Create simplified enrollment policy
CREATE POLICY "manage_own_enrollments"
ON enrollments
FOR ALL
TO authenticated
USING (
  user_id = auth.uid()
);

-- Create simplified class access policy
CREATE POLICY "view_enrolled_classes"
ON classes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM enrollments
    WHERE enrollments.class_id = classes.id
    AND enrollments.user_id = auth.uid()
    AND enrollments.status = 'active'
  )
);

-- Ensure admin user has enrollments
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

    -- Ensure all existing enrollments are active
    UPDATE enrollments
    SET status = 'active'
    WHERE user_id = admin_id;
  END IF;
END $$;