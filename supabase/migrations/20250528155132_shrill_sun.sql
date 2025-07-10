/*
  # Add RLS policy for auth.users table

  1. Changes
    - Add RLS policy to allow authenticated users to read all users
    - This is necessary for the admin panel to function correctly when querying classes with instructor data

  2. Security
    - Enables authenticated users to read user data
    - Required for admin functionality while maintaining security
*/

-- Create policy to allow authenticated users to read all users
CREATE POLICY "Allow authenticated users to read all users"
ON auth.users
FOR SELECT
TO authenticated
USING (true);