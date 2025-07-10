/*
  # Fix RLS policies to prevent infinite recursion

  1. Changes
    - Drop existing problematic policies on enrollments and classes tables
    - Create new simplified policies that avoid circular dependencies
    - Use EXISTS clauses instead of JOINs to prevent recursion
    
  2. Security
    - Maintain data access security while preventing infinite recursion
    - Ensure users can only access their own enrollments
    - Allow access to classes through enrollments without circular checks
*/

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Users can view their enrolled classes" ON classes;
DROP POLICY IF EXISTS "Users can view their enrollments" ON enrollments;

-- Enable RLS if not already enabled
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;

-- Create simplified policy for enrollments
CREATE POLICY "Users can view their enrollments"
ON enrollments
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
);

-- Create simplified policy for classes that avoids recursion
CREATE POLICY "Users can view their enrolled classes"
ON classes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM enrollments 
    WHERE 
      enrollments.class_id = classes.id 
      AND enrollments.user_id = auth.uid()
      AND enrollments.status = 'active'
  )
  OR 
  instructor_id = auth.uid()
);

-- Add policy for module_progress to prevent recursion
DROP POLICY IF EXISTS "Users can view their module progress" ON module_progress;

CREATE POLICY "Users can view their module progress"
ON module_progress
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
);