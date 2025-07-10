/*
  # Fix RLS Policies for All Tables

  1. Changes
    - Drop existing policies
    - Create new policies using auth.users instead of users
    - Fix access control for all tables
    - Ensure admin enrollments

  2. Security
    - Maintain data isolation
    - Enable proper access control
    - Fix admin access checks
*/

-- Drop existing policies to start fresh
DROP POLICY IF EXISTS "manage_own_enrollments" ON enrollments;
DROP POLICY IF EXISTS "view_enrolled_classes" ON classes;
DROP POLICY IF EXISTS "enable_module_progress_access" ON module_progress;
DROP POLICY IF EXISTS "enable_module_access" ON modules;
DROP POLICY IF EXISTS "enable_resource_access" ON resources;
DROP POLICY IF EXISTS "enable_note_access" ON notes;

-- Create policy for module progress
CREATE POLICY "enable_module_progress_access"
ON module_progress
FOR ALL
TO authenticated
USING (
  EXISTS ( 
    SELECT 1
    FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.email = 'Nick@one80services.com'
  ) OR (
    EXISTS ( 
      SELECT 1
      FROM modules m
      JOIN classes c ON c.id = m.class_id
      WHERE m.id = module_progress.module_id
      AND c.instructor_id = auth.uid()
    )
  ) OR (
    user_id = auth.uid()
  )
);

-- Create policy for class access
CREATE POLICY "view_enrolled_classes"
ON classes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM enrollments
    WHERE enrollments.class_id = classes.id
    AND enrollments.user_id = auth.uid()
    AND enrollments.status = 'active'
  ) OR (
    EXISTS (
      SELECT 1
      FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email = 'Nick@one80services.com'
    )
  )
);

-- Create policy for enrollments
CREATE POLICY "manage_own_enrollments"
ON enrollments
FOR ALL
TO authenticated
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1
    FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.email = 'Nick@one80services.com'
  )
)
WITH CHECK (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1
    FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.email = 'Nick@one80services.com'
  )
);

-- Create policy for modules
CREATE POLICY "enable_module_access"
ON modules
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM enrollments e
    WHERE e.class_id = modules.class_id
    AND e.user_id = auth.uid()
    AND e.status = 'active'
  ) OR (
    EXISTS (
      SELECT 1
      FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email = 'Nick@one80services.com'
    )
  )
);

-- Create policy for resources
CREATE POLICY "enable_resource_access"
ON resources
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM modules m
    JOIN enrollments e ON e.class_id = m.class_id
    WHERE m.id = resources.module_id
    AND e.user_id = auth.uid()
    AND e.status = 'active'
  ) OR (
    EXISTS (
      SELECT 1
      FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email = 'Nick@one80services.com'
    )
  )
);

-- Create policy for notes
CREATE POLICY "enable_note_access"
ON notes
FOR ALL
TO authenticated
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1
    FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.email = 'Nick@one80services.com'
  )
)
WITH CHECK (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1
    FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.email = 'Nick@one80services.com'
  )
);

-- Ensure admin user has enrollments for all classes
DO $$
DECLARE
  admin_id uuid;
BEGIN
  -- Get admin user ID
  SELECT id INTO admin_id 
  FROM auth.users 
  WHERE email = 'admin@example.com';

  IF admin_id IS NOT NULL THEN
    -- Insert enrollments for any missing classes
    INSERT INTO enrollments (user_id, class_id, status)
    SELECT 
      admin_id,
      c.id,
      'active'
    FROM classes c
    WHERE NOT EXISTS (
      SELECT 1 FROM enrollments e 
      WHERE e.user_id = admin_id
      AND e.class_id = c.id
    );

    -- Ensure all existing enrollments are active
    UPDATE enrollments
    SET status = 'active'
    WHERE user_id = admin_id;
  END IF;
END $$;