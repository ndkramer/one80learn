/*
  # Fix RLS Policies for Student Portal Access

  1. Changes
    - Update RLS policies to properly handle student access
    - Fix admin access checks
    - Ensure proper data isolation
    - Add instructor access policies

  2. Security
    - Students can only access their enrolled content
    - Instructors can manage their own classes
    - Admin has full access
    - Proper data isolation between users
*/

-- Drop existing policies
DROP POLICY IF EXISTS "enable_class_access" ON classes;
DROP POLICY IF EXISTS "enable_enrollment_access" ON enrollments;
DROP POLICY IF EXISTS "enable_module_access" ON modules;
DROP POLICY IF EXISTS "enable_resource_access" ON resources;
DROP POLICY IF EXISTS "enable_note_access" ON notes;
DROP POLICY IF EXISTS "enable_module_progress_access" ON module_progress;

-- Create policy for classes
CREATE POLICY "enable_class_access"
ON classes
FOR ALL
TO authenticated
USING (
  instructor_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM enrollments
    WHERE enrollments.class_id = classes.id
    AND enrollments.user_id = auth.uid()
    AND enrollments.status = 'active'
  )
);

-- Create policy for enrollments
CREATE POLICY "enable_enrollment_access"
ON enrollments
FOR ALL
TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM classes
    WHERE classes.id = enrollments.class_id
    AND classes.instructor_id = auth.uid()
  )
);

-- Create policy for modules
CREATE POLICY "enable_module_access"
ON modules
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM classes
    WHERE classes.id = modules.class_id
    AND (
      classes.instructor_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM enrollments
        WHERE enrollments.class_id = classes.id
        AND enrollments.user_id = auth.uid()
        AND enrollments.status = 'active'
      )
    )
  )
);

-- Create policy for resources
CREATE POLICY "enable_resource_access"
ON resources
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM modules m
    JOIN classes c ON c.id = m.class_id
    WHERE m.id = resources.module_id
    AND (
      c.instructor_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM enrollments e
        WHERE e.class_id = c.id
        AND e.user_id = auth.uid()
        AND e.status = 'active'
      )
    )
  )
);

-- Create policy for notes
CREATE POLICY "enable_note_access"
ON notes
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Create policy for module progress
CREATE POLICY "enable_module_progress_access"
ON module_progress
FOR ALL
TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM modules m
    JOIN classes c ON c.id = m.class_id
    WHERE m.id = module_progress.module_id
    AND c.instructor_id = auth.uid()
  )
)
WITH CHECK (user_id = auth.uid());

-- Create admin override policies
CREATE POLICY "admin_override_classes"
ON classes
FOR ALL
TO authenticated
USING (auth.email() = 'Nick@one80services.com')
WITH CHECK (auth.email() = 'Nick@one80services.com');

CREATE POLICY "admin_override_enrollments"
ON enrollments
FOR ALL
TO authenticated
USING (auth.email() = 'Nick@one80services.com')
WITH CHECK (auth.email() = 'Nick@one80services.com');

CREATE POLICY "admin_override_modules"
ON modules
FOR ALL
TO authenticated
USING (auth.email() = 'Nick@one80services.com')
WITH CHECK (auth.email() = 'Nick@one80services.com');

CREATE POLICY "admin_override_resources"
ON resources
FOR ALL
TO authenticated
USING (auth.email() = 'Nick@one80services.com')
WITH CHECK (auth.email() = 'Nick@one80services.com');

CREATE POLICY "admin_override_notes"
ON notes
FOR ALL
TO authenticated
USING (auth.email() = 'Nick@one80services.com')
WITH CHECK (auth.email() = 'Nick@one80services.com');

CREATE POLICY "admin_override_module_progress"
ON module_progress
FOR ALL
TO authenticated
USING (auth.email() = 'Nick@one80services.com')
WITH CHECK (auth.email() = 'Nick@one80services.com');