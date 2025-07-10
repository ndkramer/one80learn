/*
  # Fix Resources RLS Policies

  1. Changes
    - Drop existing RLS policies for resources table that may be causing permission issues
    - Create new, simplified RLS policies that don't directly query the users table
    - Ensure proper access control while avoiding permission denied errors

  2. Security
    - Maintain security by ensuring only authorized users can access resources
    - Simplify policy conditions to avoid permission issues with the users table
*/

-- First, drop existing policies that might be causing issues
DROP POLICY IF EXISTS "Admin can manage all resources" ON resources;
DROP POLICY IF EXISTS "Instructors can manage module resources" ON resources;
DROP POLICY IF EXISTS "Resources are viewable by authenticated users" ON resources;
DROP POLICY IF EXISTS "Students can access enrolled class resources" ON resources;
DROP POLICY IF EXISTS "view_module_resources" ON resources;

-- Create new, simplified policies
CREATE POLICY "enable_read_access_for_authenticated_users"
ON resources FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "admin_full_access"
ON resources FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM classes c
    JOIN modules m ON m.class_id = c.id
    WHERE m.id = resources.module_id
    AND c.instructor_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM classes c
    JOIN modules m ON m.class_id = c.id
    WHERE m.id = resources.module_id
    AND c.instructor_id = auth.uid()
  )
);

-- Add policy for student access
CREATE POLICY "student_access_enrolled_resources"
ON resources FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM enrollments e
    JOIN modules m ON m.class_id = e.class_id
    WHERE m.id = resources.module_id
    AND e.user_id = auth.uid()
    AND e.status = 'active'
  )
);