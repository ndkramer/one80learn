/*
  # Fix Resource URL Requirements

  1. Changes
    - Make URL optional for all resource types except 'link'
    - Update constraints to enforce URL only for link type
    - Add proper validation for URL field

  2. Security
    - Maintain existing RLS policies
    - Preserve data integrity
*/

-- Drop existing URL constraint
ALTER TABLE resources
DROP CONSTRAINT IF EXISTS resources_link_url_required;

-- Add new URL constraint that only requires URL for link type
ALTER TABLE resources
ADD CONSTRAINT resources_link_url_required
CHECK (
  (type = 'link' AND url IS NOT NULL AND url != '') OR
  (type != 'link')
);

-- Drop NOT NULL constraint on URL column if it exists
ALTER TABLE resources 
ALTER COLUMN url DROP NOT NULL;