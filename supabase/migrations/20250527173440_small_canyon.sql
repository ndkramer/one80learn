/*
  # Fix RLS policies for enrollments and module progress

  1. Changes
    - Update RLS policies for enrollments table to use auth.uid() directly
    - Update RLS policies for module_progress table to use auth.uid() directly
    - Remove dependencies on users table in policies
    
  2. Security
    - Policies ensure users can only access their own data
    - Instructors maintain access to their class data
    - Admin access preserved
*/

-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Users can view their enrollments with class details" ON enrollments;
DROP POLICY IF EXISTS "Users can manage their enrollments" ON enrollments;

-- Create new policies for enrollments
CREATE POLICY "Users can view their own enrollments"
  ON enrollments
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = enrollments.class_id 
      AND classes.instructor_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their own enrollments"
  ON enrollments
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Drop existing policies for module_progress
DROP POLICY IF EXISTS "Users can view their module progress" ON module_progress;
DROP POLICY IF EXISTS "Users can manage their own progress" ON module_progress;

-- Create new policies for module_progress
CREATE POLICY "Users can view their own progress"
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

CREATE POLICY "Users can manage their own progress"
  ON module_progress
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());