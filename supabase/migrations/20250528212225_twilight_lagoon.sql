/*
  # Fix RLS Policies for Class Access

  1. Changes
    - Simplify RLS policies to prevent recursion
    - Fix class access for enrolled users
    - Ensure proper admin access
    - Add proper instructor access

  2. Security
    - Maintain data isolation
    - Preserve access control
    - Fix permission issues
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "enable_class_access" ON classes;
DROP POLICY IF EXISTS "enable_enrollment_access" ON enrollments;
DROP POLICY IF EXISTS "enable_module_access" ON modules;
DROP POLICY IF EXISTS "enable_resource_access" ON resources;
DROP POLICY IF EXISTS "enable_note_access" ON notes;
DROP POLICY IF EXISTS "enable_module_progress_access" ON module_progress;

-- Create simplified policy for classes
CREATE POLICY "enable_class_access"
ON classes
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.email = 'Nick@one80services.com'
  )
  OR instructor_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM enrollments
    WHERE enrollments.class_id = classes.id
    AND enrollments.user_id = auth.uid()
    AND enrollments.status = 'active'
  )
);

-- Create simplified policy for enrollments
CREATE POLICY "enable_enrollment_access"
ON enrollments
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.email = 'Nick@one80services.com'
  )
  OR user_id = auth.uid()
);

-- Create simplified policy for modules
CREATE POLICY "enable_module_access"
ON modules
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.email = 'Nick@one80services.com'
  )
  OR EXISTS (
    SELECT 1 FROM classes
    WHERE classes.id = modules.class_id
    AND classes.instructor_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM enrollments
    WHERE enrollments.class_id = modules.class_id
    AND enrollments.user_id = auth.uid()
    AND enrollments.status = 'active'
  )
);

-- Create simplified policy for resources
CREATE POLICY "enable_resource_access"
ON resources
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.email = 'Nick@one80services.com'
  )
  OR EXISTS (
    SELECT 1 FROM modules m
    JOIN classes c ON c.id = m.class_id
    WHERE m.id = resources.module_id
    AND c.instructor_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM modules m
    JOIN enrollments e ON e.class_id = m.class_id
    WHERE m.id = resources.module_id
    AND e.user_id = auth.uid()
    AND e.status = 'active'
  )
);

-- Create simplified policy for notes
CREATE POLICY "enable_note_access"
ON notes
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.email = 'Nick@one80services.com'
  )
  OR user_id = auth.uid()
);

-- Create simplified policy for module_progress
CREATE POLICY "enable_module_progress_access"
ON module_progress
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.email = 'Nick@one80services.com'
  )
  OR user_id = auth.uid()
);