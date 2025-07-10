/*
  # Add Admin Roles Table

  1. New Tables
    - `admin_roles`
      - Links to auth.users
      - Tracks admin status
      - Controls admin access

  2. Security
    - Enable RLS
    - Add policies for admin access
    - Update existing table policies
*/

-- Create admin_roles table
CREATE TABLE IF NOT EXISTS admin_roles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE admin_roles ENABLE ROW LEVEL SECURITY;

-- Add initial admin user
INSERT INTO admin_roles (user_id)
SELECT id FROM auth.users
WHERE email = 'Nick@one80services.com'
ON CONFLICT (user_id) DO NOTHING;

-- Drop existing policies
DROP POLICY IF EXISTS "admin_override" ON classes;
DROP POLICY IF EXISTS "instructor_or_student_access" ON classes;
DROP POLICY IF EXISTS "admin_override" ON enrollments;
DROP POLICY IF EXISTS "user_access" ON enrollments;
DROP POLICY IF EXISTS "admin_override" ON modules;
DROP POLICY IF EXISTS "instructor_or_student_access" ON modules;
DROP POLICY IF EXISTS "admin_override" ON resources;
DROP POLICY IF EXISTS "instructor_or_student_access" ON resources;
DROP POLICY IF EXISTS "admin_override" ON notes;
DROP POLICY IF EXISTS "user_access" ON notes;
DROP POLICY IF EXISTS "admin_override" ON module_progress;
DROP POLICY IF EXISTS "user_access" ON module_progress;

-- Create new policies using admin_roles check
CREATE POLICY "admin_override"
ON classes FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM admin_roles
  WHERE admin_roles.user_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM admin_roles
  WHERE admin_roles.user_id = auth.uid()
));

CREATE POLICY "instructor_or_student_access"
ON classes FOR SELECT
TO authenticated
USING (
  instructor_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM enrollments
    WHERE enrollments.class_id = classes.id
    AND enrollments.user_id = auth.uid()
    AND enrollments.status = 'active'
  )
);

CREATE POLICY "admin_override"
ON enrollments FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM admin_roles
  WHERE admin_roles.user_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM admin_roles
  WHERE admin_roles.user_id = auth.uid()
));

CREATE POLICY "user_access"
ON enrollments FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "admin_override"
ON modules FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM admin_roles
  WHERE admin_roles.user_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM admin_roles
  WHERE admin_roles.user_id = auth.uid()
));

CREATE POLICY "instructor_or_student_access"
ON modules FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM classes
    WHERE classes.id = modules.class_id
    AND (
      classes.instructor_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM enrollments
        WHERE enrollments.class_id = classes.id
        AND enrollments.user_id = auth.uid()
        AND enrollments.status = 'active'
      )
    )
  )
);

CREATE POLICY "admin_override"
ON resources FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM admin_roles
  WHERE admin_roles.user_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM admin_roles
  WHERE admin_roles.user_id = auth.uid()
));

CREATE POLICY "instructor_or_student_access"
ON resources FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM modules m
    JOIN classes c ON c.id = m.class_id
    WHERE m.id = resources.module_id
    AND (
      c.instructor_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM enrollments e
        WHERE e.class_id = c.id
        AND e.user_id = auth.uid()
        AND e.status = 'active'
      )
    )
  )
);

CREATE POLICY "admin_override"
ON notes FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM admin_roles
  WHERE admin_roles.user_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM admin_roles
  WHERE admin_roles.user_id = auth.uid()
));

CREATE POLICY "user_access"
ON notes FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "admin_override"
ON module_progress FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM admin_roles
  WHERE admin_roles.user_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM admin_roles
  WHERE admin_roles.user_id = auth.uid()
));

CREATE POLICY "user_access"
ON module_progress FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());