/*
  # Revert RLS Policies to Working State

  1. Changes
    - Drop current policies that are causing issues
    - Restore previous working policies for classes, modules, and notes
    - Use auth.email() for admin checks
    - Maintain proper access control hierarchy
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "admin_full_access" ON classes;
DROP POLICY IF EXISTS "authenticated_users_view_classes" ON classes;
DROP POLICY IF EXISTS "instructor_manage_own_classes" ON classes;

-- Restore working policies for classes
CREATE POLICY "admin_full_access"
ON classes
FOR ALL
TO authenticated
USING (auth.email() = 'Nick@one80services.com')
WITH CHECK (auth.email() = 'Nick@one80services.com');

CREATE POLICY "instructor_manage_own_classes"
ON classes
FOR ALL
TO authenticated
USING (instructor_id = auth.uid())
WITH CHECK (instructor_id = auth.uid());

CREATE POLICY "authenticated_users_view_classes"
ON classes
FOR SELECT
TO authenticated
USING (true);

-- Drop and recreate module policies
DROP POLICY IF EXISTS "admin_full_access" ON modules;
DROP POLICY IF EXISTS "instructor_manage_modules" ON modules;
DROP POLICY IF EXISTS "student_view_enrolled_modules" ON modules;

CREATE POLICY "admin_full_access"
ON modules
FOR ALL
TO authenticated
USING (auth.email() = 'Nick@one80services.com')
WITH CHECK (auth.email() = 'Nick@one80services.com');

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

-- Drop and recreate note policies
DROP POLICY IF EXISTS "admin_full_access" ON notes;
DROP POLICY IF EXISTS "instructor_view_notes" ON notes;
DROP POLICY IF EXISTS "users_manage_own_notes" ON notes;

CREATE POLICY "admin_full_access"
ON notes
FOR ALL
TO authenticated
USING (auth.email() = 'Nick@one80services.com')
WITH CHECK (auth.email() = 'Nick@one80services.com');

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