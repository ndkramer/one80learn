/*
  # Update modules table structure
  
  1. Changes
    - Remove slideUrl column from modules table
    - Ensure slide_pdf_url column exists
    
  2. Security
    - Maintain existing RLS policies
    - Preserve data integrity
*/

-- First check if slideUrl column exists and drop it
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'modules' 
    AND column_name = 'slideUrl'
  ) THEN
    ALTER TABLE modules DROP COLUMN "slideUrl";
  END IF;
END $$;

-- Ensure slide_pdf_url column exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'modules' 
    AND column_name = 'slide_pdf_url'
  ) THEN
    ALTER TABLE modules ADD COLUMN slide_pdf_url text;
  END IF;
END $$;