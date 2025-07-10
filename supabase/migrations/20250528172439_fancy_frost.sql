/*
  # Enhance Resources Management
  
  1. Changes
    - Add file_type column with allowed types
    - Add file_size tracking
    - Update type constraints
    - Add admin access policy
    
  2. Security
    - Maintain existing RLS
    - Add admin override policy
*/

-- Add new columns to resources table
ALTER TABLE resources
ADD COLUMN IF NOT EXISTS file_type text CHECK (file_type IN ('pdf', 'word', 'excel', 'video', 'link')),
ADD COLUMN IF NOT EXISTS file_size bigint;

-- Drop old type check constraint
ALTER TABLE resources
DROP CONSTRAINT IF EXISTS resources_type_check;

-- Add new type check constraint
ALTER TABLE resources
ADD CONSTRAINT resources_type_check 
CHECK (type IN ('pdf', 'word', 'excel', 'video', 'link'));

-- Add admin policy
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy 
    WHERE polname = 'Admin can manage all resources'
    AND polrelid = 'resources'::regclass
  ) THEN
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
  END IF;
END $$;