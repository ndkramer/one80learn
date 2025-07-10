/*
  # Fix slide_url column name
  
  1. Changes
    - Rename slide_url column to slideUrl in modules table
    - Update existing data
    - Maintain foreign key relationships
    
  2. Security
    - Preserve existing data
    - Maintain RLS policies
*/

-- Rename the column
ALTER TABLE modules 
RENAME COLUMN slide_url TO "slideUrl";