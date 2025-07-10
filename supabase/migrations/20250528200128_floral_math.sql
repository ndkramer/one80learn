/*
  # Fix Admin User Enrollments

  1. Changes
    - Ensure admin user is enrolled in all classes
    - Set all enrollments to active status
    - Add missing enrollments if any
*/

-- First, get the admin user's ID
WITH admin_user AS (
  SELECT id FROM auth.users WHERE email = 'admin@example.com'
)
-- Then insert enrollments for all classes
INSERT INTO enrollments (user_id, class_id, status)
SELECT 
  (SELECT id FROM admin_user),
  id,
  'active'
FROM classes
WHERE NOT EXISTS (
  SELECT 1 FROM enrollments e 
  WHERE e.user_id = (SELECT id FROM admin_user)
  AND e.class_id = classes.id
);

-- Update any existing enrollments to active status
UPDATE enrollments
SET status = 'active'
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'admin@example.com');

-- Add RLS policy for admin to view all enrollments
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