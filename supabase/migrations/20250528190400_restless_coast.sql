/*
  # Fix RLS Policies for Modules and Notes

  1. Changes
    - Update modules table policies to use JWT claims instead of auth.email()
    - Update notes table policies to use JWT claims
    - Ensure proper access control for admin, instructors, and students
    - Fix policy dependencies to prevent recursion

  2. Security
    - Maintain data isolation
    - Allow proper access for all user roles
    - Fix admin access using JWT claims
*/

-- Drop existing policies for modules
DROP POLICY IF EXISTS "admin_full_access" ON modules;
DROP POLICY IF EXISTS "instructor_manage_modules" ON modules;
DROP POLICY IF EXISTS "student_view_enrolled_modules" ON modules;

-- Create new policies for modules
CREATE POLICY "admin_full_access"
ON modules
FOR ALL
TO authenticated
USING (
  (auth.jwt() ->> 'email'::text) = 'Nick@one80services.com'
)
WITH CHECK (
  (auth.jwt() ->> 'email'::text) = 'Nick@one80services.com'
);

CREATE POLICY "instructor_manage_modules"
ON modules
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM classes
    WHERE classes.id = modules.class_id
    AND classes.instructor_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM classes
    WHERE classes.id = modules.class_id
    AND classes.instructor_id = auth.uid()
  )
);

CREATE POLICY "student_view_enrolled_modules"
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
);

-- Drop existing policies for notes
DROP POLICY IF EXISTS "Admin can view all notes" ON notes;
DROP POLICY IF EXISTS "Instructors can view student notes" ON notes;
DROP POLICY IF EXISTS "Users can manage their own notes" ON notes;

-- Create new policies for notes
CREATE POLICY "admin_full_access"
ON notes
FOR ALL
TO authenticated
USING (
  (auth.jwt() ->> 'email'::text) = 'Nick@one80services.com'
)
WITH CHECK (
  (auth.jwt() ->> 'email'::text) = 'Nick@one80services.com'
);

CREATE POLICY "instructor_view_notes"
ON notes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM modules m
    JOIN classes c ON c.id = m.class_id
    WHERE m.id = notes.module_id
    AND c.instructor_id = auth.uid()
  )
);

CREATE POLICY "users_manage_own_notes"
ON notes
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());