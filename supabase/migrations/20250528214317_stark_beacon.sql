/*
  # Enroll Nick Kramer in class

  1. Changes
    - Insert enrollment record for Nick Kramer in specified class
    - Set enrollment status to 'active'
*/

-- Get user ID for Nick Kramer
DO $$
DECLARE
  user_id uuid;
BEGIN
  SELECT id INTO user_id 
  FROM auth.users 
  WHERE email = 'Nick@one80labs.com';

  IF user_id IS NOT NULL THEN
    -- Create enrollment
    INSERT INTO enrollments (user_id, class_id, status)
    VALUES (user_id, '11111111-1111-1111-1111-111111111111', 'active');
  END IF;
END $$;