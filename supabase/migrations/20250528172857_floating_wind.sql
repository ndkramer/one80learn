/*
  # Add order column to resources table

  1. Changes
    - Add order column to resources table
    - Add index for order column
    - Update existing resources with order values
*/

-- Add order column if it doesn't exist
ALTER TABLE resources
ADD COLUMN IF NOT EXISTS "order" integer;

-- Create index for order column
CREATE INDEX IF NOT EXISTS idx_resources_order ON resources("order");

-- Update existing resources with order values
WITH numbered_resources AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as row_num
  FROM resources
)
UPDATE resources
SET "order" = numbered_resources.row_num
FROM numbered_resources
WHERE resources.id = numbered_resources.id
AND resources."order" IS NULL;