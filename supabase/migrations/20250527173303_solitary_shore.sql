/*
  # Enhance Admin Privileges

  1. Changes
    - Add comprehensive admin policies for all tables
    - Grant admin full access to all resources
    - Ensure admin can manage all content
    - Add policies for enrollments and resources

  2. Security
    - Maintain existing user policies
    - Add admin override policies
    - Ensure proper access control
*/

-- Add admin policies for resources
CREATE POLICY "Admin can manage all resources"
ON resources
FOR ALL
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

-- Add admin policies for enrollments
CREATE POLICY "Admin can manage all enrollments"
ON enrollments
FOR ALL
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

-- Add admin policies for module_progress
CREATE POLICY "Admin can view all progress"
ON module_progress
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.email = 'Nick@one80services.com'
  )
);

-- Add admin policies for notes
CREATE POLICY "Admin can view all notes"
ON notes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.email = 'Nick@one80services.com'
  )
);