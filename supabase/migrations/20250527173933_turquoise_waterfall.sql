/*
  # Fix RLS Policies to Prevent Infinite Recursion

  1. Changes
    - Simplify RLS policies to avoid circular references
    - Ensure proper access control without recursion
    - Fix policy dependencies between tables
    - Maintain security while improving performance

  2. Security
    - Maintain data isolation
    - Preserve access control rules
    - Prevent unauthorized access
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "view_classes" ON classes;
DROP POLICY IF EXISTS "manage_own_classes" ON classes;
DROP POLICY IF EXISTS "view_class_enrollments" ON enrollments;
DROP POLICY IF EXISTS "manage_own_enrollments" ON enrollments;
DROP POLICY IF EXISTS "Users can view modules for enrolled classes" ON modules;
DROP POLICY IF EXISTS "Users can view resources for enrolled classes" ON resources;

-- Create simplified policies for classes
CREATE POLICY "view_all_classes"
ON classes FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "manage_own_classes"
ON classes FOR ALL
TO authenticated
USING (instructor_id = auth.uid())
WITH CHECK (instructor_id = auth.uid());

-- Create simplified policies for enrollments
CREATE POLICY "view_own_enrollments"
ON enrollments FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "manage_own_enrollments"
ON enrollments FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "view_class_enrollments"
ON enrollments FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM classes
    WHERE classes.id = enrollments.class_id
    AND classes.instructor_id = auth.uid()
  )
);

-- Create simplified policies for modules
CREATE POLICY "view_enrolled_modules"
ON modules FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM enrollments
    WHERE enrollments.class_id = modules.class_id
    AND enrollments.user_id = auth.uid()
    AND enrollments.status = 'active'
  )
  OR
  EXISTS (
    SELECT 1 FROM classes
    WHERE classes.id = modules.class_id
    AND classes.instructor_id = auth.uid()
  )
);

-- Create simplified policies for resources
CREATE POLICY "view_module_resources"
ON resources FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM enrollments e
    JOIN classes c ON c.id = e.class_id
    JOIN modules m ON m.class_id = c.id
    WHERE m.id = resources.module_id
    AND e.user_id = auth.uid()
    AND e.status = 'active'
  )
  OR
  EXISTS (
    SELECT 1 FROM modules m
    JOIN classes c ON c.id = m.class_id
    WHERE m.id = resources.module_id
    AND c.instructor_id = auth.uid()
  )
);

-- Create simplified policies for module progress
CREATE POLICY "view_own_progress"
ON module_progress FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "manage_own_progress"
ON module_progress FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());