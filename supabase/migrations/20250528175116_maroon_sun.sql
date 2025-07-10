/*
  # Fix Resource RLS Policies

  1. Changes
    - Drop existing policies
    - Create new admin access policy using auth.email()
    - Add instructor management policy
    - Enable read access for authenticated users

  2. Security
    - Maintain proper access control
    - Fix email function reference
    - Ensure proper policy evaluation
*/

-- Drop existing policies
DROP POLICY IF EXISTS "admin_full_access" ON resources;
DROP POLICY IF EXISTS "enable_read_access_for_authenticated_users" ON resources;
DROP POLICY IF EXISTS "instructor_manage_resources" ON resources;

-- Create new simplified policies
CREATE POLICY "admin_full_access"
ON resources
FOR ALL
TO authenticated
USING (
  (auth.jwt() ->> 'email'::text) = 'Nick@one80services.com'
)
WITH CHECK (
  (auth.jwt() ->> 'email'::text) = 'Nick@one80services.com'
);

CREATE POLICY "instructor_manage_resources"
ON resources
FOR ALL
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

CREATE POLICY "enable_read_access_for_authenticated_users"
ON resources
FOR SELECT
TO authenticated
USING (true);