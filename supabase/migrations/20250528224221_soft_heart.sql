/*
  # Enroll Student User in All Classes
  
  1. Changes
    - Enroll Nick@one80labs.com in all available classes
    - Set enrollment status to 'active'
    - Handle duplicate enrollments gracefully
    
  2. Security
    - Uses direct user ID lookup
    - Maintains data integrity with ON CONFLICT clause
*/

-- Get student user ID and insert enrollments for all classes
DO $$
DECLARE
  student_id uuid;
BEGIN
  -- Get the student user's ID
  SELECT id INTO student_id 
  FROM auth.users 
  WHERE email = 'Nick@one80labs.com';

  IF student_id IS NOT NULL THEN
    -- Insert enrollments for all classes
    INSERT INTO enrollments (user_id, class_id, status)
    SELECT 
      student_id,
      id,
      'active'
    FROM classes
    ON CONFLICT (user_id, class_id) 
    DO UPDATE SET status = 'active';

    -- Log success
    RAISE NOTICE 'Successfully enrolled student % in all classes', student_id;
  ELSE
    RAISE NOTICE 'Student user not found';
  END IF;
END $$;