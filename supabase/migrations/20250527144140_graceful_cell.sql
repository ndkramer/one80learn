/*
  # Simplify Notes System

  1. Changes
    - Simplify notes table structure
    - Add proper indexes
    - Simplify RLS policies
    - Remove unnecessary complexity

  2. Security
    - Maintain user data isolation
    - Ensure proper access control
    - Simplify permission checks
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can manage their own notes" ON notes;
DROP POLICY IF EXISTS "Users can manage their note versions" ON note_versions;

-- Drop note_versions table (we'll handle versions differently)
DROP TABLE IF EXISTS note_versions;

-- Ensure notes table has proper structure
ALTER TABLE notes DROP CONSTRAINT IF EXISTS notes_user_id_module_id_key;
ALTER TABLE notes ADD CONSTRAINT notes_user_id_module_id_key UNIQUE (user_id, module_id);

-- Create proper indexes
CREATE INDEX IF NOT EXISTS idx_notes_user_module ON notes(user_id, module_id);
CREATE INDEX IF NOT EXISTS idx_notes_module_id ON notes(module_id);
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);

-- Create simple RLS policy for notes
CREATE POLICY "Users can manage their own notes"
ON notes
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());