/*
  # Fix enrollments table RLS policies

  1. Changes
    - Remove existing problematic policies that cause infinite recursion
    - Create new, simplified policies for the enrollments table:
      - Students can view and manage their own enrollments
      - Instructors can view enrollments for their classes
      - Admin has full access
  
  2. Security
    - Maintains RLS protection
    - Ensures proper access control without circular dependencies
*/

-- Drop existing policies to start fresh
DROP POLICY IF EXISTS "admin_full_access" ON enrollments;
DROP POLICY IF EXISTS "users_manage_own_enrollments" ON enrollments;
DROP POLICY IF EXISTS "instructors_view_enrollments" ON enrollments;

-- Create new, simplified policies
CREATE POLICY "enable_read_for_users"
ON enrollments
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR  -- Users can see their own enrollments
  EXISTS (  -- Instructors can see enrollments for their classes
    SELECT 1 FROM classes 
    WHERE classes.id = enrollments.class_id 
    AND classes.instructor_id = auth.uid()
  ) OR
  (SELECT email FROM auth.users WHERE auth.users.id = auth.uid()) = 'Nick@one80services.com'  -- Admin access
);

CREATE POLICY "enable_insert_for_users"
ON enrollments
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() OR  -- Users can enroll themselves
  (SELECT email FROM auth.users WHERE auth.users.id = auth.uid()) = 'Nick@one80services.com'  -- Admin access
);

CREATE POLICY "enable_update_for_users"
ON enrollments
FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid() OR  -- Users can update their own enrollments
  (SELECT email FROM auth.users WHERE auth.users.id = auth.uid()) = 'Nick@one80services.com'  -- Admin access
)
WITH CHECK (
  user_id = auth.uid() OR  -- Users can update their own enrollments
  (SELECT email FROM auth.users WHERE auth.users.id = auth.uid()) = 'Nick@one80services.com'  -- Admin access
);

CREATE POLICY "enable_delete_for_users"
ON enrollments
FOR DELETE
TO authenticated
USING (
  user_id = auth.uid() OR  -- Users can delete their own enrollments
  (SELECT email FROM auth.users WHERE auth.users.id = auth.uid()) = 'Nick@one80services.com'  -- Admin access
);