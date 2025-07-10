/*
  # Enroll admin user in specific class

  1. Changes
    - Insert enrollment record for admin user
    - Set status to active
    - Use specific user and class IDs
    - Handle duplicate enrollment gracefully
*/

-- Insert enrollment for admin user in Introduction to Computer Science
INSERT INTO enrollments (user_id, class_id, status)
VALUES (
  '85096bf7-2825-4158-a392-d3c629aa7891',  -- Admin user ID
  '11111111-1111-1111-1111-111111111111',  -- Introduction to Computer Science class ID
  'active'
)
ON CONFLICT (user_id, class_id) 
DO UPDATE SET status = 'active';

-- Log the enrollment for verification
DO $$
BEGIN
  RAISE NOTICE 'Enrollment created/updated for user 85096bf7-2825-4158-a392-d3c629aa7891 in class 11111111-1111-1111-1111-111111111111';
END $$;