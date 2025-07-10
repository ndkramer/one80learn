-- Drop all existing policies
DO $$ 
BEGIN
  EXECUTE (
    SELECT string_agg('DROP POLICY IF EXISTS ' || quote_ident(policyname) || ' ON ' || quote_ident(tablename) || ';', E'\n')
    FROM pg_policies 
    WHERE schemaname = 'public'
  );
END $$;

-- Create basic policies for student access
CREATE POLICY "enable_read_classes"
ON classes
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "enable_read_enrollments"
ON enrollments
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "enable_read_modules"
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

CREATE POLICY "enable_read_resources"
ON resources
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM modules m
    JOIN enrollments e ON e.class_id = m.class_id
    WHERE m.id = resources.module_id
    AND e.user_id = auth.uid()
    AND e.status = 'active'
  )
);

CREATE POLICY "enable_notes_access"
ON notes
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "enable_progress_access"
ON module_progress
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());