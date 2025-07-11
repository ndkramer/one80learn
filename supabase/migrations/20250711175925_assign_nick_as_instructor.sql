/*
  # Assign Nick@one80labs.com as Instructor for All Courses
  
  1. Changes
    - Update all existing classes to have Nick@one80labs.com as instructor
    - Set Nick@one80labs.com as super admin in user metadata
    - Ensure proper instructor permissions for presentation sync
    
  2. Security
    - Maintains existing data integrity
    - Provides proper instructor access for course management
    - Enables presentation sync functionality
*/

-- Update all existing classes to have Nick@one80labs.com as instructor
DO $$
DECLARE
  nick_user_id uuid;
  classes_updated integer;
  enrollments_added integer;
BEGIN
  -- Get Nick's user ID from his email
  SELECT id INTO nick_user_id 
  FROM auth.users 
  WHERE email = 'Nick@one80labs.com';

  IF nick_user_id IS NOT NULL THEN
    -- Update all classes to have Nick as instructor
    UPDATE classes
    SET instructor_id = nick_user_id
    WHERE instructor_id IS NULL OR instructor_id != nick_user_id;
    
    GET DIAGNOSTICS classes_updated = ROW_COUNT;

    RAISE NOTICE 'Updated % classes to have Nick@one80labs.com as instructor', classes_updated;
    
    -- Set Nick as super admin in user metadata
    UPDATE auth.users
    SET user_metadata = COALESCE(user_metadata, '{}'::jsonb) || '{"is_super_admin": true}'::jsonb
    WHERE email = 'Nick@one80labs.com';
    
    RAISE NOTICE 'Set Nick@one80labs.com as super admin';
    
    -- Ensure Nick is enrolled in all classes as well (for testing purposes)
    INSERT INTO enrollments (user_id, class_id, status)
    SELECT 
      nick_user_id,
      c.id,
      'active'
    FROM classes c
    WHERE NOT EXISTS (
      SELECT 1 FROM enrollments e 
      WHERE e.user_id = nick_user_id
      AND e.class_id = c.id
      AND e.status = 'active'
    );
    
    GET DIAGNOSTICS enrollments_added = ROW_COUNT;
    
    RAISE NOTICE 'Added % enrollments for Nick@one80labs.com', enrollments_added;
    
    -- Show total counts for verification
    RAISE NOTICE 'Nick@one80labs.com is now instructor of % total classes', 
      (SELECT COUNT(*) FROM classes WHERE instructor_id = nick_user_id);
    
  ELSE
    RAISE NOTICE 'User Nick@one80labs.com not found in auth.users table';
  END IF;
END $$;
