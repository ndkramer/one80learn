/*
  # Fix auth.users RLS Policies
  
  1. Changes
    - Drop existing RLS policies
    - Create new policy allowing read access for authenticated users
    - Fix permission issues
    
  2. Security
    - Allow authenticated users to read user data
    - Maintain basic authentication check
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Allow authenticated users to read user data" ON auth.users;

-- Create policy for read access
CREATE POLICY "Allow authenticated users to read user data"
ON auth.users
FOR SELECT
TO authenticated
USING (true);