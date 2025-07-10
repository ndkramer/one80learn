/*
  # Update Resources Table

  1. Changes
    - Make URL field optional for all resource types
    - Add file_path column for uploaded files
    - Add download_count tracking
    - Add updated_at display support

  2. Security
    - Maintain existing RLS policies
    - Ensure proper access control
*/

-- Drop existing URL constraint
ALTER TABLE resources
DROP CONSTRAINT IF EXISTS resources_link_url_required;

-- Drop NOT NULL constraint on URL column if it exists
ALTER TABLE resources 
ALTER COLUMN url DROP NOT NULL;

-- Add file_path column for uploaded files if it doesn't exist
ALTER TABLE resources
ADD COLUMN IF NOT EXISTS file_path text;

-- Add download_count column if it doesn't exist
ALTER TABLE resources
ADD COLUMN IF NOT EXISTS download_count bigint DEFAULT 0;

-- Create index for download tracking
CREATE INDEX IF NOT EXISTS idx_resources_downloads ON resources(download_count);

-- Create index for URL column
CREATE INDEX IF NOT EXISTS idx_resources_url ON resources(url)
WHERE url IS NOT NULL;

-- Update any existing resources to handle NULL URLs
UPDATE resources
SET url = NULL
WHERE url = '';