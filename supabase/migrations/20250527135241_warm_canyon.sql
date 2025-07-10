/*
  # Fix Notes Schema and Versioning

  1. Changes
    - Add module_id to note_versions table
    - Update RLS policies for notes and versions
    - Ensure proper user_id handling
    - Fix constraints and indexes

  2. Security
    - Maintain user data isolation
    - Ensure proper access control
    - Prevent unauthorized access
*/

-- Drop existing note_versions table and recreate with correct structure
DROP TABLE IF EXISTS note_versions;

CREATE TABLE note_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid REFERENCES modules(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_note_versions_module_id ON note_versions(module_id);
CREATE INDEX idx_note_versions_user_id ON note_versions(user_id);

-- Enable RLS
ALTER TABLE note_versions ENABLE ROW LEVEL SECURITY;

-- Create policies for note versions
CREATE POLICY "Users can manage their note versions"
ON note_versions
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Update notes table policies
DROP POLICY IF EXISTS "Users can manage their own notes" ON notes;

CREATE POLICY "Users can manage their own notes"
ON notes
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());