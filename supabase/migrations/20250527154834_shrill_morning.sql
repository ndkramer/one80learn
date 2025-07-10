/*
  # Fix Notes Table Structure and Constraints

  1. Changes
    - Drop and recreate notes table with simplified structure
    - Add proper constraints and indexes
    - Update RLS policies
    - Ensure proper cascading behavior

  2. Security
    - Maintain user data isolation
    - Ensure proper access control
*/

-- Drop existing notes table and recreate with proper structure
DROP TABLE IF EXISTS notes CASCADE;

CREATE TABLE notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_id uuid NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  content text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, module_id)
);

-- Create indexes
CREATE INDEX idx_notes_user_id ON notes(user_id);
CREATE INDEX idx_notes_module_id ON notes(module_id);
CREATE INDEX idx_notes_user_module ON notes(user_id, module_id);

-- Enable RLS
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage their own notes"
ON notes
FOR ALL
TO authenticated
USING (
  user_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM enrollments e
    JOIN classes c ON c.id = e.class_id
    JOIN modules m ON m.class_id = c.id
    WHERE m.id = module_id
    AND e.user_id = auth.uid()
    AND e.status = 'active'
  )
)
WITH CHECK (
  user_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM enrollments e
    JOIN classes c ON c.id = e.class_id
    JOIN modules m ON m.class_id = c.id
    WHERE m.id = module_id
    AND e.user_id = auth.uid()
    AND e.status = 'active'
  )
);

-- Create updated_at trigger
CREATE TRIGGER update_notes_updated_at
  BEFORE UPDATE ON notes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();