/*
  # Fix RLS Policies

  1. Changes
    - Drop existing policies
    - Create simplified policies for all tables
    - Fix admin access using auth.email()
    - Ensure proper access control
*/

-- Drop existing policies
DO $$ 
BEGIN
  EXECUTE (
    SELECT string_agg('DROP POLICY IF EXISTS ' || quote_ident(policyname) || ' ON ' || quote_ident(tablename) || ';', E'\n')
    FROM pg_policies 
    WHERE schemaname = 'public'
  );
END $$;

-- Create simplified policies
CREATE POLICY "admin_override"
ON classes FOR ALL
TO authenticated
USING (auth.email() = 'Nick@one80services.com')
WITH CHECK (auth.email() = 'Nick@one80services.com');

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
USING (auth.email() = 'Nick@one80services.com')
WITH CHECK (auth.email() = 'Nick@one80services.com');

CREATE POLICY "user_access"
ON enrollments FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "admin_override"
ON modules FOR ALL
TO authenticated
USING (auth.email() = 'Nick@one80services.com')
WITH CHECK (auth.email() = 'Nick@one80services.com');

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
USING (auth.email() = 'Nick@one80services.com')
WITH CHECK (auth.email() = 'Nick@one80services.com');

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
USING (auth.email() = 'Nick@one80services.com')
WITH CHECK (auth.email() = 'Nick@one80services.com');

CREATE POLICY "user_access"
ON notes FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "admin_override"
ON module_progress FOR ALL
TO authenticated
USING (auth.email() = 'Nick@one80services.com')
WITH CHECK (auth.email() = 'Nick@one80services.com');

CREATE POLICY "user_access"
ON module_progress FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());