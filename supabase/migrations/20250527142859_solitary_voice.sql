/*
  # Fix Notes Table Structure

  1. Changes
    - Add unique constraint for user_id and module_id
    - Update RLS policies to ensure proper note isolation
    - Add indexes for better performance

  2. Security
    - Ensure notes are properly isolated per module
    - Maintain user-specific access control
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can manage their own notes" ON notes;
DROP POLICY IF EXISTS "Users can manage their note versions" ON note_versions;

-- Ensure unique constraint exists
ALTER TABLE notes DROP CONSTRAINT IF EXISTS notes_user_id_module_id_key;
ALTER TABLE notes ADD CONSTRAINT notes_user_id_module_id_key UNIQUE (user_id, module_id);

-- Create new RLS policies
CREATE POLICY "Users can manage their own notes"
ON notes
FOR ALL
TO authenticated
USING (
  user_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM modules m
    JOIN classes c ON c.id = m.class_id
    JOIN enrollments e ON e.class_id = c.id
    WHERE m.id = module_id
    AND e.user_id = auth.uid()
    AND e.status = 'active'
  )
)
WITH CHECK (
  user_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM modules m
    JOIN classes c ON c.id = m.class_id
    JOIN enrollments e ON e.class_id = c.id
    WHERE m.id = module_id
    AND e.user_id = auth.uid()
    AND e.status = 'active'
  )
);

-- Update note versions policy
CREATE POLICY "Users can manage their note versions"
ON note_versions
FOR ALL
TO authenticated
USING (
  user_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM modules m
    JOIN classes c ON c.id = m.class_id
    JOIN enrollments e ON e.class_id = c.id
    WHERE m.id = module_id
    AND e.user_id = auth.uid()
    AND e.status = 'active'
  )
)
WITH CHECK (
  user_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM modules m
    JOIN classes c ON c.id = m.class_id
    JOIN enrollments e ON e.class_id = c.id
    WHERE m.id = module_id
    AND e.user_id = auth.uid()
    AND e.status = 'active'
  )
);