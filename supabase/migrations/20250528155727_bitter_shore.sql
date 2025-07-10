/*
  # Fix Modules RLS Policies

  1. Changes
    - Remove references to users table
    - Use auth.email() directly for admin checks
    - Simplify policy structure
    - Fix permission issues

  2. Security
    - Maintain admin access
    - Preserve instructor permissions
    - Ensure proper student access
*/

-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Admin can manage all modules" ON modules;
DROP POLICY IF EXISTS "Instructors can manage their class modules" ON modules;
DROP POLICY IF EXISTS "Modules are viewable by authenticated users" ON modules;
DROP POLICY IF EXISTS "Students can access enrolled class modules" ON modules;
DROP POLICY IF EXISTS "view_enrolled_modules" ON modules;

-- Create new consolidated policies
CREATE POLICY "admin_full_access" ON modules
FOR ALL TO authenticated
USING (
  auth.email() = 'Nick@one80services.com'
)
WITH CHECK (
  auth.email() = 'Nick@one80services.com'
);

CREATE POLICY "instructor_manage_modules" ON modules
FOR ALL TO authenticated
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

CREATE POLICY "student_view_enrolled_modules" ON modules
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM enrollments
    WHERE enrollments.class_id = modules.class_id
    AND enrollments.user_id = auth.uid()
    AND enrollments.status = 'active'
  )
);