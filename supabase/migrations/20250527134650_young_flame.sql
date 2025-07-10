/*
  # Fix Notes Table Constraints

  1. Changes
    - Add unique constraint for user_id and module_id
    - Fix ON CONFLICT handling for notes
    - Ensure proper error handling for note operations

  2. Security
    - Maintain existing RLS policies
    - Preserve data integrity
*/

-- Add unique constraint to notes table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'notes_user_id_module_id_key'
  ) THEN
    ALTER TABLE notes 
    ADD CONSTRAINT notes_user_id_module_id_key 
    UNIQUE (user_id, module_id);
  END IF;
END $$;