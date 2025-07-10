-- Drop existing policies
DROP POLICY IF EXISTS "admin_full_access" ON classes;
DROP POLICY IF EXISTS "authenticated_users_view_classes" ON classes;
DROP POLICY IF EXISTS "instructor_manage_own_classes" ON classes;

-- Create new simplified policies
CREATE POLICY "admin_full_access"
ON classes
FOR ALL
TO authenticated
USING (
  (auth.jwt() ->> 'email'::text) = 'Nick@one80services.com'
)
WITH CHECK (
  (auth.jwt() ->> 'email'::text) = 'Nick@one80services.com'
);

CREATE POLICY "instructor_manage_own_classes"
ON classes
FOR ALL
TO authenticated
USING (instructor_id = auth.uid())
WITH CHECK (instructor_id = auth.uid());

CREATE POLICY "authenticated_users_view_classes"
ON classes
FOR SELECT
TO authenticated
USING (true);