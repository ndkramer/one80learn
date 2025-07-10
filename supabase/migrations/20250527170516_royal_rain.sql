/*
  # Fix Enrollments for Admin User
  
  1. Changes
    - Ensure admin user is enrolled in all classes
    - Fix any missing enrollments
    - Maintain active status
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