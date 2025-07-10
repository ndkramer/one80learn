/*
  # Fix Enrollment Policies

  1. Changes
    - Drop existing policies
    - Create new simplified policies for admin, users, and instructors
    - Add performance indexes
    - Ensure unique constraint exists

  2. Security
    - Maintain data isolation
    - Allow proper access control
    - Fix admin access check
*/

-- Drop existing policies to start fresh
DROP POLICY IF EXISTS "admin_manage_enrollments" ON enrollments;
DROP POLICY IF EXISTS "students_manage_enrollments" ON enrollments;
DROP POLICY IF EXISTS "instructors_view_enrollments" ON enrollments;

-- Create new simplified policies
CREATE POLICY "admin_full_access"
ON enrollments
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.email = 'Nick@one80services.com'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.email = 'Nick@one80services.com'
  )
);

CREATE POLICY "users_manage_own_enrollments"
ON enrollments
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "instructors_view_enrollments"
ON enrollments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM classes c
    WHERE c.id = enrollments.class_id
    AND c.instructor_id = auth.uid()
  )
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_enrollments_user_id ON enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_class_id ON enrollments(class_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_status ON enrollments(status);

-- Add unique constraint if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'enrollments_user_id_class_id_key'
  ) THEN
    ALTER TABLE enrollments 
    ADD CONSTRAINT enrollments_user_id_class_id_key 
    UNIQUE (user_id, class_id);
  END IF;
END $$;