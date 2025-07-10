/*
  # Fix RLS Policies for Module Progress and Classes

  1. Changes
    - Update module_progress policies to fix permission issues
    - Update classes policies to ensure proper access
    - Remove attempts to modify auth.users table
    
  2. Security
    - Maintain proper access control
    - Fix permission denied errors
    - Ensure instructor access to student data
*/

-- Update module_progress policies
DROP POLICY IF EXISTS "view_module_progress" ON module_progress;
CREATE POLICY "view_module_progress" ON module_progress
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR 
    EXISTS (
      SELECT 1 
      FROM modules m
      JOIN classes c ON c.id = m.class_id
      WHERE m.id = module_progress.module_id 
      AND c.instructor_id = auth.uid()
    )
  );

-- Update classes policies
DROP POLICY IF EXISTS "authenticated_users_view_classes" ON classes;
CREATE POLICY "authenticated_users_view_classes" ON classes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM enrollments e 
      WHERE e.class_id = classes.id 
      AND e.user_id = auth.uid()
      AND e.status = 'active'
    ) OR 
    instructor_id = auth.uid()
  );