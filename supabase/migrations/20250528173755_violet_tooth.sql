/*
  # Update Resources URL Constraint

  1. Changes
    - Make URL optional for all resource types except 'link'
    - Add check constraint to enforce URL requirement for links
    - Maintain existing data integrity

  2. Security
    - Preserve existing RLS policies
    - Maintain data validation
*/

-- First, drop the NOT NULL constraint on the url column
ALTER TABLE resources
ALTER COLUMN url DROP NOT NULL;

-- Add a check constraint to ensure links have URLs
ALTER TABLE resources
ADD CONSTRAINT resources_link_url_required
CHECK (
  (type = 'link' AND url IS NOT NULL AND url != '') OR
  (type != 'link')
);

-- Add comment explaining the constraint
COMMENT ON CONSTRAINT resources_link_url_required ON resources IS 
'Ensures that resources of type "link" must have a URL, while other types may have an optional URL';