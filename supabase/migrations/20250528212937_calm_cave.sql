/*
  # Fix Admin User Enrollments

  1. Changes
    - Get admin user ID dynamically
    - Create enrollments for all classes
    - Set enrollments to active status
    - Add proper RLS policies
*/

-- First, ensure the admin user has enrollments for all classes
DO $$
DECLARE
  admin_id uuid;
BEGIN
  -- Get the admin user's ID dynamically
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

    -- Log the number of enrollments for verification
    RAISE NOTICE 'Admin user now has % enrollments', (
      SELECT COUNT(*) 
      FROM enrollments 
      WHERE user_id = admin_id
    );
  ELSE
    RAISE NOTICE 'Admin user not found';
  END IF;
END $$;

-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "enable_enrollment_access" ON enrollments;

-- Create new simplified policy for enrollments
CREATE POLICY "enable_enrollment_access"
ON enrollments
FOR ALL
TO authenticated
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM classes
    WHERE classes.id = enrollments.class_id
    AND classes.instructor_id = auth.uid()
  )
);