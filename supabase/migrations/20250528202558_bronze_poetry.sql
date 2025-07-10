/*
  # Fix Admin User Enrollments
  
  1. Changes
    - Directly insert enrollments for admin user
    - Use explicit user ID instead of subquery
    - Ensure all classes are enrolled
    - Set all enrollments to active status
    
  2. Security
    - Maintains existing RLS policies
    - Preserves data integrity
*/

-- Get admin user ID and insert directly
INSERT INTO enrollments (user_id, class_id, status)
SELECT 
  '85096bf7-2825-4158-a392-d3c629aa7891', -- Admin user ID
  id,
  'active'
FROM classes
WHERE NOT EXISTS (
  SELECT 1 FROM enrollments e 
  WHERE e.user_id = '85096bf7-2825-4158-a392-d3c629aa7891'
  AND e.class_id = classes.id
);

-- Update any existing enrollments to active status
UPDATE enrollments
SET status = 'active'
WHERE user_id = '85096bf7-2825-4158-a392-d3c629aa7891';

-- Log the number of enrollments for verification
DO $$
DECLARE
  enrollment_count integer;
BEGIN
  SELECT COUNT(*) INTO enrollment_count 
  FROM enrollments 
  WHERE user_id = '85096bf7-2825-4158-a392-d3c629aa7891';
  
  RAISE NOTICE 'Admin user now has % enrollments', enrollment_count;
END $$;