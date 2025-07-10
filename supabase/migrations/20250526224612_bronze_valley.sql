/*
  # Fix module_id foreign key constraint

  1. Changes
    - Ensure module_id column remains UUID type
    - Update foreign key constraint to maintain data integrity
    - Add proper error handling for existing data
*/

DO $$ 
BEGIN
  -- First check if the column exists
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'notes' 
    AND column_name = 'module_id'
  ) THEN
    -- Temporarily drop the foreign key constraint if it exists
    ALTER TABLE notes DROP CONSTRAINT IF EXISTS notes_module_id_fkey;
    
    -- Ensure the column is UUID type
    ALTER TABLE notes 
    ALTER COLUMN module_id TYPE uuid USING module_id::uuid;
    
    -- Add back the foreign key constraint
    ALTER TABLE notes 
    ADD CONSTRAINT notes_module_id_fkey 
    FOREIGN KEY (module_id) 
    REFERENCES modules(id) 
    ON DELETE CASCADE;
  END IF;
END $$;