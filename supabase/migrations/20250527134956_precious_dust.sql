/*
  # Add RLS policies for note versions

  1. Changes
    - Add RLS policies for note_versions table
    - Enable users to create and manage their note versions
    - Ensure proper access control for note history
    
  2. Security
    - Users can only access versions of their own notes
    - Maintain data isolation between users
    - Prevent unauthorized access to note history
*/

-- Enable RLS on note_versions if not already enabled
ALTER TABLE note_versions ENABLE ROW LEVEL SECURITY;

-- Add policy for managing note versions
CREATE POLICY "Users can manage their note versions"
ON note_versions
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM notes
    WHERE notes.id = note_versions.note_id
    AND notes.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM notes
    WHERE notes.id = note_versions.note_id
    AND notes.user_id = auth.uid()
  )
);