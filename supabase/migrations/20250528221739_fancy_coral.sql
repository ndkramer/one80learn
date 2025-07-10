/*
  # Ensure Student Enrollment

  1. Changes
    - Get user ID for Nick@one80labs.com
    - Create enrollment for Introduction to Computer Science class
    - Set enrollment status to active
    - Handle duplicate enrollments gracefully

  2. Security
    - Maintain existing RLS policies
    - Preserve data integrity
*/

-- Get user ID and insert enrollment
DO $$
DECLARE
  student_id uuid;
BEGIN
  -- Get the student user's ID
  SELECT id INTO student_id 
  FROM auth.users 
  WHERE email = 'Nick@one80labs.com';

  IF student_id IS NOT NULL THEN
    -- Insert enrollment for Introduction to Computer Science
    INSERT INTO enrollments (user_id, class_id, status)
    VALUES (
      student_id,
      '11111111-1111-1111-1111-111111111111',  -- Introduction to Computer Science class ID
      'active'
    )
    ON CONFLICT (user_id, class_id) 
    DO UPDATE SET status = 'active';

    -- Log success
    RAISE NOTICE 'Successfully enrolled student % in Introduction to Computer Science', student_id;
  ELSE
    RAISE NOTICE 'Student user not found';
  END IF;
END $$;