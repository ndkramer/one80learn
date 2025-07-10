/*
  # Update RLS Policies for Classes

  1. Changes
    - Drop existing RLS policies for classes table
    - Create new policy to restrict class visibility to enrolled users
    - Add policy for instructors to view their classes
    - Ensure proper data isolation
    
  2. Security
    - Users can only see classes they're enrolled in
    - Instructors can see classes they teach
    - Maintain data isolation between users
*/

-- Drop existing policies for classes table
DROP POLICY IF EXISTS "enable_read_classes" ON classes;
DROP POLICY IF EXISTS "enable_class_access" ON classes;
DROP POLICY IF EXISTS "admin_override" ON classes;
DROP POLICY IF EXISTS "instructor_or_student_access" ON classes;
DROP POLICY IF EXISTS "Classes are viewable by authenticated users" ON classes;

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
  OR EXISTS (
    SELECT 1 FROM admin
    WHERE admin.user_id = auth.uid()
    AND admin.admin = 'Y'
  )
);

-- Create policy for instructors to manage their classes
CREATE POLICY "enable_instructor_class_management"
ON classes
FOR ALL
TO authenticated
USING (
  instructor_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM admin
    WHERE admin.user_id = auth.uid()
    AND admin.admin = 'Y'
  )
)
WITH CHECK (
  instructor_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM admin
    WHERE admin.user_id = auth.uid()
    AND admin.admin = 'Y'
  )
);