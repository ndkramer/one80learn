/*
  # Fix Resource URL Requirements

  1. Changes
    - Drop existing URL constraints
    - Make URL optional for non-link resources
    - Ensure URL is required only for 'link' type
    - Update existing data to handle NULL URLs

  2. Security
    - Maintain existing RLS policies
    - Preserve data integrity
*/

-- First, drop existing URL constraint
ALTER TABLE resources
DROP CONSTRAINT IF EXISTS resources_link_url_required;

-- Drop NOT NULL constraint on URL column if it exists
ALTER TABLE resources 
ALTER COLUMN url DROP NOT NULL;

-- Add new URL constraint that only requires URL for link type
ALTER TABLE resources
ADD CONSTRAINT resources_link_url_required
CHECK (
  (type = 'link' AND url IS NOT NULL AND url != '') OR
  (type != 'link')
);

-- Update any existing non-link resources to have NULL URL if empty
UPDATE resources
SET url = NULL
WHERE type != 'link' AND (url IS NULL OR url = '');