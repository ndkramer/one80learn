/*
  # Fix Notes RLS Policies

  1. Changes
    - Update RLS policies for notes table
    - Add policies for instructors and admin access
    - Fix permission issues with auth.users references

  2. Security
    - Users can manage their own notes
    - Instructors can view student notes
    - Admin has full access to all notes
*/

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can manage their own notes" ON notes;
DROP POLICY IF EXISTS "Admin can view all notes" ON notes;
DROP POLICY IF EXISTS "Instructors can view student notes" ON notes;

-- Create new policies for the notes table
CREATE POLICY "Users can manage their own notes"
ON notes
FOR ALL
TO authenticated
USING (
  user_id = auth.uid()
)
WITH CHECK (
  user_id = auth.uid()
);

CREATE POLICY "Instructors can view student notes"
ON notes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM modules m
    JOIN classes c ON c.id = m.class_id
    WHERE m.id = notes.module_id
    AND c.instructor_id = auth.uid()
  )
);

CREATE POLICY "Admin can view all notes"
ON notes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.email = 'Nick@one80services.com'
  )
);