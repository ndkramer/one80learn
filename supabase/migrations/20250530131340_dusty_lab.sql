/*
  # Update RLS Policies
  
  1. Changes
    - Update RLS policies to remove admin checks
    - Maintain proper access control for students and instructors
    - Keep admin table intact
    
  2. Security
    - Students can only access their enrolled classes
    - Instructors can manage their own classes
    - Maintain data isolation
*/

-- Drop existing policies for classes table
DROP POLICY IF EXISTS "enable_enrolled_class_access" ON classes;
DROP POLICY IF EXISTS "enable_instructor_class_management" ON classes;

-- Create new policy for enrolled students
CREATE POLICY "enable_enrolled_class_access"
ON classes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM enrollments
    WHERE enrollments.class_id = classes.id
    AND enrollments.user_id = auth.uid()
    AND enrollments.status = 'active'
  )
  OR instructor_id = auth.uid()
);

-- Create policy for instructors to manage their classes
CREATE POLICY "enable_instructor_class_management"
ON classes
FOR ALL
TO authenticated
USING (instructor_id = auth.uid())
WITH CHECK (instructor_id = auth.uid());

-- Update modules policy
DROP POLICY IF EXISTS "enable_read_modules" ON modules;

CREATE POLICY "enable_read_modules"
ON modules
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM enrollments
    WHERE enrollments.class_id = modules.class_id
    AND enrollments.user_id = auth.uid()
    AND enrollments.status = 'active'
  )
  OR EXISTS (
    SELECT 1 FROM classes
    WHERE classes.id = modules.class_id
    AND classes.instructor_id = auth.uid()
  )
);

-- Update resources policy
DROP POLICY IF EXISTS "enable_read_resources" ON resources;

CREATE POLICY "enable_read_resources"
ON resources
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM modules m
    JOIN enrollments e ON e.class_id = m.class_id
    WHERE m.id = resources.module_id
    AND e.user_id = auth.uid()
    AND e.status = 'active'
  )
  OR EXISTS (
    SELECT 1 FROM modules m
    JOIN classes c ON c.id = m.class_id
    WHERE m.id = resources.module_id
    AND c.instructor_id = auth.uid()
  )
);