/*
  # Update Resources Table Structure

  1. Changes
    - Make URL optional for all resource types except links
    - Add file_path column for uploaded files
    - Update constraints and policies
    - Add download tracking

  2. Security
    - Maintain existing access control
    - Ensure proper file handling
*/

-- Drop existing URL constraint
ALTER TABLE resources
DROP CONSTRAINT IF EXISTS resources_link_url_required;

-- Add file_path column for uploaded files
ALTER TABLE resources
ADD COLUMN IF NOT EXISTS file_path text;

-- Add new URL constraint that only requires URL for link type
ALTER TABLE resources
ADD CONSTRAINT resources_link_url_required
CHECK (
  (type = 'link' AND url IS NOT NULL AND url != '') OR
  (type != 'link')
);

-- Add download count column
ALTER TABLE resources
ADD COLUMN IF NOT EXISTS download_count bigint DEFAULT 0;

-- Create index for download tracking
CREATE INDEX IF NOT EXISTS idx_resources_downloads ON resources(download_count);

-- Update existing resources to use proper file handling
UPDATE resources
SET 
  url = NULL,
  file_path = url
WHERE 
  type != 'link' 
  AND url IS NOT NULL;