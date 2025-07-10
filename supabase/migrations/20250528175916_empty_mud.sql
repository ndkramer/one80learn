/*
  # Make URL Optional for Resources

  1. Changes
    - Remove URL constraints
    - Make URL field optional for all resource types
    - Add proper indexing for URLs
    - Update existing records

  2. Security
    - Maintain existing RLS policies
    - Preserve data integrity
*/

-- Drop existing URL constraint
ALTER TABLE resources
DROP CONSTRAINT IF EXISTS resources_link_url_required;

-- Drop NOT NULL constraint on URL column if it exists
ALTER TABLE resources 
ALTER COLUMN url DROP NOT NULL;

-- Update any existing resources to handle NULL URLs
UPDATE resources
SET url = NULL
WHERE url = '';

-- Add index for URL column to improve query performance
CREATE INDEX IF NOT EXISTS idx_resources_url ON resources(url)
WHERE url IS NOT NULL;