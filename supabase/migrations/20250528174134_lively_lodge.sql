/*
  # Fix Resource Constraints and Permissions

  1. Changes
    - Drop existing URL constraint
    - Add new conditional URL constraint
    - Update RLS policies for proper access
    - Fix permission issues

  2. Security
    - Maintain data integrity
    - Ensure proper access control
*/

-- Drop existing link URL constraint
ALTER TABLE resources
DROP CONSTRAINT IF EXISTS resources_link_url_required;

-- Add new, more flexible URL constraint
ALTER TABLE resources
ADD CONSTRAINT resources_link_url_required
CHECK (
  (type = 'link' AND url IS NOT NULL AND url != '') OR
  (type != 'link')
);

-- Drop existing policies
DROP POLICY IF EXISTS "enable_read_access_for_authenticated_users" ON resources;
DROP POLICY IF EXISTS "admin_full_access" ON resources;
DROP POLICY IF EXISTS "student_access_enrolled_resources" ON resources;

-- Create new simplified policies
CREATE POLICY "enable_read_access_for_authenticated_users"
ON resources FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "admin_full_access"
ON resources FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.email = 'Nick@one80services.com'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.email = 'Nick@one80services.com'
  )
);

-- Add instructor access policy
CREATE POLICY "instructor_manage_resources"
ON resources FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM modules m
    JOIN classes c ON c.id = m.class_id
    WHERE m.id = resources.module_id
    AND c.instructor_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM modules m
    JOIN classes c ON c.id = m.class_id
    WHERE m.id = resources.module_id
    AND c.instructor_id = auth.uid()
  )
);