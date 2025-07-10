/*
  # Fix recursive RLS policy for classes table

  1. Changes
    - Drop existing RLS policies for classes table
    - Create new, simplified RLS policies:
      - Admin can manage all courses
      - Instructors can manage their own courses
      - Students can view courses they're enrolled in
      - Instructors can view courses they teach

  2. Security
    - Maintains RLS protection
    - Eliminates recursive policy conditions
    - Preserves existing access patterns
*/

-- Drop existing policies
DROP POLICY IF EXISTS "admin_full_access" ON classes;
DROP POLICY IF EXISTS "authenticated_users_view_classes" ON classes;

-- Create new policies
CREATE POLICY "admin_full_access" ON classes
  FOR ALL 
  TO authenticated
  USING (auth.jwt()->>'email' = 'Nick@one80services.com')
  WITH CHECK (auth.jwt()->>'email' = 'Nick@one80services.com');

CREATE POLICY "instructors_manage_own_courses" ON classes
  FOR ALL
  TO authenticated
  USING (instructor_id = auth.uid())
  WITH CHECK (instructor_id = auth.uid());

CREATE POLICY "students_view_enrolled_courses" ON classes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM enrollments
      WHERE 
        enrollments.class_id = classes.id 
        AND enrollments.user_id = auth.uid()
        AND enrollments.status = 'active'
    )
  );