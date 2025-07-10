/*
  # Enable Full Access for All Users
  
  1. Changes
    - Drop all existing policies
    - Create new policies allowing full access for authenticated users
    - Remove all restrictions based on user_id or enrollment status
    - Enable complete CRUD operations for all tables
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
  WHEN OTHERS THEN NULL;
END $$;

-- Create full access policies for all tables
CREATE POLICY "enable_full_access"
ON classes
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "enable_full_access"
ON modules
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "enable_full_access"
ON resources
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "enable_full_access"
ON enrollments
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "enable_full_access"
ON notes
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "enable_full_access"
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

-- Create policy for auth.users
DROP POLICY IF EXISTS "Allow authenticated users to read user data" ON auth.users;

CREATE POLICY "Allow authenticated users to read user data"
ON auth.users
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);