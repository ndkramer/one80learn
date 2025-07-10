/*
  # Add RLS Policy for auth.users Table
  
  1. Changes
    - Add RLS policy to allow authenticated users to read auth.users table
    - Required for User Admin functionality
    - Maintains security by only allowing read access
    
  2. Security
    - Only allows SELECT operations
    - Requires authentication
    - No modification access granted
*/

-- Create policy to allow authenticated users to read user data
CREATE POLICY "Allow authenticated users to read user data"
ON auth.users
FOR SELECT
TO authenticated
USING (true);