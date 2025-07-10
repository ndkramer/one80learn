/*
  # Add Note Version History

  1. New Tables
    - `note_versions`
      - Stores historical versions of notes
      - Tracks changes over time
      - Enables version restoration
      - Maintains audit trail

  2. Security
    - Enable RLS
    - Restrict access to note owners
    - Maintain data isolation
*/

-- Create note_versions table
CREATE TABLE IF NOT EXISTS note_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id uuid REFERENCES notes(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_note_versions_note_id ON note_versions(note_id);

-- Enable RLS
ALTER TABLE note_versions ENABLE ROW LEVEL SECURITY;

-- Create policy for note owners
CREATE POLICY "Users can view their note versions"
ON note_versions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM notes
    WHERE notes.id = note_versions.note_id
    AND notes.user_id = auth.uid()
  )
);