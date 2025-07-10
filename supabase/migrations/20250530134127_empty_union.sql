/*
  # Fix Login Issues
  
  1. Changes
    - Drop all existing policies
    - Create simple policies for all tables
    - Allow all authenticated users to read classes, modules, and resources
    - Maintain user-specific access for personal data
    
  2. Security
    - Basic authentication is enabled
    - User-specific data remains isolated
    - All authenticated users can view content
*/

-- Drop all existing policies
DO $$ 
BEGIN
  EXECUTE (
    SELECT string_agg('DROP POLICY IF EXISTS ' || quote_ident(policyname) || ' ON ' || quote_ident(tablename) || ';', E'\n')
    FROM pg_policies 
    WHERE schemaname = 'public'
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error dropping policies: %', SQLERRM;
END $$;

-- Create simple read policies for all tables
CREATE POLICY "enable_read_classes"
ON classes
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "enable_read_modules"
ON modules
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "enable_read_resources"
ON resources
FOR SELECT
TO authenticated
USING (true);

-- Create policies for user-specific data
CREATE POLICY "enable_read_enrollments"
ON enrollments
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "enable_insert_enrollments"
ON enrollments
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "enable_update_enrollments"
ON enrollments
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "enable_delete_enrollments"
ON enrollments
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "enable_manage_notes"
ON notes
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "enable_manage_progress"
ON module_progress
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Ensure RLS is enabled on all tables
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE module_progress ENABLE ROW LEVEL SECURITY;

-- Ensure all users have admin records
INSERT INTO admin (user_id, admin)
SELECT 
  id,
  'N'
FROM auth.users
WHERE id NOT IN (
  SELECT user_id FROM admin
)
ON CONFLICT (user_id) DO NOTHING;

-- Set admin status for Nick@one80services.com
UPDATE admin
SET admin = 'Y'
WHERE user_id IN (
  SELECT id FROM auth.users
  WHERE email = 'Nick@one80services.com'
);