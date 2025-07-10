/*
  # Fix Resource Drag and Drop Functionality

  1. Changes
    - Drop existing policies that might interfere
    - Create new policies with proper access control
    - Ensure proper order column handling
    - Fix admin access using JWT claims

  2. Security
    - Maintain data isolation
    - Allow proper resource management
    - Enable drag and drop reordering
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

-- Ensure order column has default value
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'resources'
    AND column_name = 'order'
    AND column_default IS NOT NULL
  ) THEN
    ALTER TABLE resources
    ALTER COLUMN "order" SET DEFAULT 0;
  END IF;
END $$;