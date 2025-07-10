/*
  # Fix RLS Policies

  1. Changes
    - Remove direct auth.users table queries
    - Simplify policies to prevent recursion
    - Use auth.email() function instead of table queries
    - Fix circular dependencies in enrollments policies

  2. Security
    - Maintain existing access control rules
    - Prevent unauthorized access
    - Keep data properly isolated
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "students_view_own_enrollments" ON enrollments;
DROP POLICY IF EXISTS "instructors_view_class_enrollments" ON enrollments;
DROP POLICY IF EXISTS "students_manage_own_enrollments" ON enrollments;
DROP POLICY IF EXISTS "admin_manage_all_enrollments" ON enrollments;

-- Create new simplified policies for enrollments
CREATE POLICY "students_view_own_enrollments"
ON enrollments
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "students_manage_own_enrollments"
ON enrollments
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "instructors_view_class_enrollments"
ON enrollments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM classes
    WHERE classes.id = enrollments.class_id
    AND classes.instructor_id = auth.uid()
  )
);

CREATE POLICY "admin_manage_all_enrollments"
ON enrollments
FOR ALL
TO authenticated
USING (auth.email() = 'Nick@one80services.com')
WITH CHECK (auth.email() = 'Nick@one80services.com');

-- Drop existing module_progress policies
DROP POLICY IF EXISTS "view_module_progress" ON module_progress;
DROP POLICY IF EXISTS "manage_own_progress" ON module_progress;

-- Create new simplified policies for module_progress
CREATE POLICY "view_module_progress"
ON module_progress
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM classes c
    JOIN modules m ON m.class_id = c.id
    WHERE m.id = module_progress.module_id
    AND c.instructor_id = auth.uid()
  )
);

CREATE POLICY "manage_own_progress"
ON module_progress
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());