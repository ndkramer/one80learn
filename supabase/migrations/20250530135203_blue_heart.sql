/*
  # Enable Full Admin Access for All Users
  
  1. Changes
    - Drop existing RLS policies
    - Create new policies allowing all authenticated users full access
    - Remove admin-specific checks
    - Enable full CRUD operations for all users
    
  2. Security
    - Any authenticated user can perform admin actions
    - Maintain basic authentication check
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

-- Create full access policies for all tables
CREATE POLICY "enable_full_access_classes"
ON classes
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "enable_full_access_modules"
ON modules
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "enable_full_access_resources"
ON resources
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "enable_full_access_enrollments"
ON enrollments
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "enable_full_access_notes"
ON notes
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "enable_full_access_progress"
ON module_progress
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Ensure RLS is enabled on all tables
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE module_progress ENABLE ROW LEVEL SECURITY;