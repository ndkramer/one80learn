/*
  # Fix RLS policies for enrollments and module_progress

  1. Changes
    - Simplify RLS policies for enrollments table to avoid recursion
    - Add straightforward RLS policies for module_progress table
    - Remove any complex policy conditions that might cause circular dependencies

  2. Security
    - Maintain security by ensuring users can only access their own data
    - Use simple, direct user ID comparison for access control
*/

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "enable_delete_enrollments" ON enrollments;
DROP POLICY IF EXISTS "enable_insert_enrollments" ON enrollments;
DROP POLICY IF EXISTS "enable_read_enrollments" ON enrollments;
DROP POLICY IF EXISTS "enable_update_enrollments" ON enrollments;

-- Create simplified policies for enrollments
CREATE POLICY "enable_read_enrollments"
ON enrollments
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "enable_insert_enrollments"
ON enrollments
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "enable_update_enrollments"
ON enrollments
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "enable_delete_enrollments"
ON enrollments
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Drop existing policies for module_progress if they exist
DROP POLICY IF EXISTS "enable_manage_progress" ON module_progress;

-- Create simplified policies for module_progress
CREATE POLICY "enable_read_progress"
ON module_progress
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "enable_insert_progress"
ON module_progress
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "enable_update_progress"
ON module_progress
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "enable_delete_progress"
ON module_progress
FOR DELETE
TO authenticated
USING (user_id = auth.uid());