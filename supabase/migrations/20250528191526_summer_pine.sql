/*
  # Remove Instructor Management Scope
  
  1. Changes
    - Remove instructor management policies
    - Simplify access control to basic read/write
    - Maintain admin access and student access
    - Remove unnecessary complexity
    
  2. Security
    - Maintain data isolation
    - Preserve admin capabilities
    - Keep student access intact
*/

-- Drop existing policies
DROP POLICY IF EXISTS "admin_full_access" ON classes;
DROP POLICY IF EXISTS "authenticated_users_view_classes" ON classes;
DROP POLICY IF EXISTS "instructor_manage_own_classes" ON classes;

-- Create simplified policies for classes
CREATE POLICY "admin_full_access"
ON classes
FOR ALL
TO authenticated
USING (auth.email() = 'Nick@one80services.com')
WITH CHECK (auth.email() = 'Nick@one80services.com');

CREATE POLICY "authenticated_users_view_classes"
ON classes
FOR SELECT
TO authenticated
USING (true);

-- Drop and recreate module policies
DROP POLICY IF EXISTS "admin_full_access" ON modules;
DROP POLICY IF EXISTS "instructor_manage_modules" ON modules;
DROP POLICY IF EXISTS "student_view_enrolled_modules" ON modules;

CREATE POLICY "admin_full_access"
ON modules
FOR ALL
TO authenticated
USING (auth.email() = 'Nick@one80services.com')
WITH CHECK (auth.email() = 'Nick@one80services.com');

CREATE POLICY "student_view_enrolled_modules"
ON modules
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM enrollments
    WHERE enrollments.class_id = modules.class_id
    AND enrollments.user_id = auth.uid()
    AND enrollments.status = 'active'
  )
);

-- Drop and recreate resource policies
DROP POLICY IF EXISTS "admin_full_access" ON resources;
DROP POLICY IF EXISTS "instructor_manage_resources" ON resources;
DROP POLICY IF EXISTS "enable_read_access_for_authenticated_users" ON resources;

CREATE POLICY "admin_full_access"
ON resources
FOR ALL
TO authenticated
USING (auth.email() = 'Nick@one80services.com')
WITH CHECK (auth.email() = 'Nick@one80services.com');

CREATE POLICY "enable_read_access_for_authenticated_users"
ON resources
FOR SELECT
TO authenticated
USING (true);