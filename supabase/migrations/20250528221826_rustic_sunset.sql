/*
  # Ensure Student Enrollments

  1. Changes
    - Get student user ID
    - Insert enrollments for all classes
    - Set all enrollments to active status
    - Handle duplicate enrollments gracefully
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
    WHERE NOT EXISTS (
      SELECT 1 FROM enrollments e 
      WHERE e.user_id = student_id
      AND e.class_id = classes.id
    );

    -- Update any existing enrollments to active status
    UPDATE enrollments
    SET status = 'active'
    WHERE user_id = student_id;

    -- Log success
    RAISE NOTICE 'Successfully enrolled student % in all classes', student_id;
  ELSE
    RAISE NOTICE 'Student user not found';
  END IF;
END $$;