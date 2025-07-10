/*
  # Fix Notes Table RLS and Constraints

  1. Changes
    - Add unique constraint for user_id and module_id
    - Update RLS policies to properly handle note creation and updates
    - Fix note querying behavior

  2. Security
    - Maintain user data isolation
    - Allow users to manage their own notes
    - Prevent unauthorized access
*/

-- Add unique constraint if it doesn't exist
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'notes_user_id_module_id_key'
  ) THEN
    ALTER TABLE notes ADD CONSTRAINT notes_user_id_module_id_key UNIQUE (user_id, module_id);
  END IF;
END $$;

-- Drop existing RLS policies
DROP POLICY IF EXISTS "Users can manage their own notes" ON notes;

-- Create new RLS policies
CREATE POLICY "Users can manage their own notes"
ON notes
FOR ALL
TO authenticated
USING (
  auth.uid() = user_id OR
  (
    user_id IS NULL AND
    EXISTS (
      SELECT 1 FROM modules m
      JOIN classes c ON c.id = m.class_id
      WHERE m.id = module_id AND
      (
        EXISTS (
          SELECT 1 FROM enrollments e
          WHERE e.class_id = c.id
          AND e.user_id = auth.uid()
          AND e.status = 'active'
        ) OR
        c.instructor_id = auth.uid()
      )
    )
  )
)
WITH CHECK (
  auth.uid() = user_id OR
  user_id IS NULL
);