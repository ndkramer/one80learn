/*
  # Fix RLS Policies for Data Access

  1. Changes
    - Update module_progress policies to allow proper access
    - Add enrollments policies for class access
    - Fix class viewing permissions
    - Add module access policies
    - Add resource access policies

  2. Security
    - Maintain data isolation
    - Allow instructors to view their class data
    - Enable proper joins between tables
*/

-- Update module_progress policies
CREATE POLICY "Users can view their module progress" ON module_progress
FOR SELECT TO authenticated
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM classes c
    JOIN modules m ON m.class_id = c.id
    WHERE m.id = module_progress.module_id
    AND c.instructor_id = auth.uid()
  )
);

-- Update enrollments policies to allow viewing enrolled classes with joins
CREATE POLICY "Users can view their enrollments with class details" ON enrollments
FOR SELECT TO authenticated
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM classes
    WHERE classes.id = enrollments.class_id
    AND classes.instructor_id = auth.uid()
  )
);

-- Ensure classes can be viewed when joined through enrollments
CREATE POLICY "Users can view enrolled class details" ON classes
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM enrollments
    WHERE enrollments.class_id = classes.id
    AND enrollments.user_id = auth.uid()
    AND enrollments.status = 'active'
  ) OR
  instructor_id = auth.uid()
);

-- Allow viewing modules for enrolled classes
CREATE POLICY "Users can view modules for enrolled classes" ON modules
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM enrollments e
    WHERE e.class_id = modules.class_id
    AND e.user_id = auth.uid()
    AND e.status = 'active'
  ) OR
  EXISTS (
    SELECT 1 FROM classes
    WHERE classes.id = modules.class_id
    AND classes.instructor_id = auth.uid()
  )
);

-- Allow viewing resources for enrolled classes
CREATE POLICY "Users can view resources for enrolled classes" ON resources
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM enrollments e
    JOIN classes c ON c.id = e.class_id
    JOIN modules m ON m.class_id = c.id
    WHERE m.id = resources.module_id
    AND e.user_id = auth.uid()
    AND e.status = 'active'
  ) OR
  EXISTS (
    SELECT 1 FROM modules m
    JOIN classes c ON c.id = m.class_id
    WHERE m.id = resources.module_id
    AND c.instructor_id = auth.uid()
  )
);