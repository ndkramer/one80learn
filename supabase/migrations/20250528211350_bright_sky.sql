/*
  # Fix Admin Access Policies

  1. Changes
    - Drop existing policies that might conflict
    - Create new simplified policies for all tables
    - Ensure admin has full access to all data
    - Fix class visibility for admin user
    
  2. Security
    - Maintain data isolation for regular users
    - Grant admin full access
    - Preserve existing access patterns
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their enrolled classes" ON classes;
DROP POLICY IF EXISTS "Users can view their enrollments" ON enrollments;
DROP POLICY IF EXISTS "Users can view their module progress" ON module_progress;

-- Create new policy for classes
CREATE POLICY "enable_class_access"
ON classes
FOR ALL
TO authenticated
USING (
  -- Admin can access all classes
  auth.email() = 'Nick@one80services.com'
  OR
  -- Users can see classes they're enrolled in
  EXISTS (
    SELECT 1 
    FROM enrollments 
    WHERE 
      enrollments.class_id = classes.id 
      AND enrollments.user_id = auth.uid()
      AND enrollments.status = 'active'
  )
);

-- Create new policy for enrollments
CREATE POLICY "enable_enrollment_access"
ON enrollments
FOR ALL
TO authenticated
USING (
  -- Admin can access all enrollments
  auth.email() = 'Nick@one80services.com'
  OR
  -- Users can see their own enrollments
  user_id = auth.uid()
);

-- Create new policy for module_progress
CREATE POLICY "enable_module_progress_access"
ON module_progress
FOR ALL
TO authenticated
USING (
  -- Admin can access all progress
  auth.email() = 'Nick@one80services.com'
  OR
  -- Users can see their own progress
  user_id = auth.uid()
);

-- Create new policy for modules
CREATE POLICY "enable_module_access"
ON modules
FOR ALL
TO authenticated
USING (
  -- Admin can access all modules
  auth.email() = 'Nick@one80services.com'
  OR
  -- Users can see modules for classes they're enrolled in
  EXISTS (
    SELECT 1 
    FROM enrollments 
    WHERE 
      enrollments.class_id = modules.class_id 
      AND enrollments.user_id = auth.uid()
      AND enrollments.status = 'active'
  )
);

-- Create new policy for resources
CREATE POLICY "enable_resource_access"
ON resources
FOR ALL
TO authenticated
USING (
  -- Admin can access all resources
  auth.email() = 'Nick@one80services.com'
  OR
  -- Users can see resources for modules they have access to
  EXISTS (
    SELECT 1 
    FROM modules m
    JOIN enrollments e ON e.class_id = m.class_id
    WHERE 
      m.id = resources.module_id
      AND e.user_id = auth.uid()
      AND e.status = 'active'
  )
);

-- Create new policy for notes
CREATE POLICY "enable_note_access"
ON notes
FOR ALL
TO authenticated
USING (
  -- Admin can access all notes
  auth.email() = 'Nick@one80services.com'
  OR
  -- Users can see their own notes
  user_id = auth.uid()
)
WITH CHECK (
  -- Admin can modify all notes
  auth.email() = 'Nick@one80services.com'
  OR
  -- Users can only modify their own notes
  user_id = auth.uid()
);