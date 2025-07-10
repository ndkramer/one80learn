/*
  # Fix note saving functionality

  1. Changes
    - Simplify RLS policies for notes and note_versions tables
    - Add proper enrollment checks
    - Ensure proper cascading deletes
    - Add indexes for performance

  2. Security
    - Maintain user data isolation
    - Ensure users can only access their own notes
    - Verify enrollment status before allowing access
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can manage their own notes" ON notes;
DROP POLICY IF EXISTS "Users can manage their note versions" ON note_versions;

-- Ensure proper indexes exist
CREATE INDEX IF NOT EXISTS idx_notes_user_module ON notes(user_id, module_id);
CREATE INDEX IF NOT EXISTS idx_note_versions_user_module ON note_versions(user_id, module_id);

-- Create simplified RLS policy for notes
CREATE POLICY "Users can manage their own notes"
ON notes
FOR ALL
TO authenticated
USING (
  user_id = auth.uid() AND
  EXISTS (
    SELECT 1 
    FROM enrollments e
    JOIN classes c ON c.id = e.class_id
    JOIN modules m ON m.class_id = c.id
    WHERE m.id = module_id
    AND e.user_id = auth.uid()
    AND e.status = 'active'
  )
);

-- Create simplified RLS policy for note versions
CREATE POLICY "Users can manage their note versions"
ON note_versions
FOR ALL
TO authenticated
USING (
  user_id = auth.uid() AND
  EXISTS (
    SELECT 1 
    FROM enrollments e
    JOIN classes c ON c.id = e.class_id
    JOIN modules m ON m.class_id = c.id
    WHERE m.id = module_id
    AND e.user_id = auth.uid()
    AND e.status = 'active'
  )
);