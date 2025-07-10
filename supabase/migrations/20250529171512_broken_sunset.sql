/*
  # Fix admin table RLS policies

  1. Changes
    - Drop existing policies
    - Create new policy to allow users to only read their own admin status
    - Maintain service role access for admin management
    
  2. Security
    - Users can only query their own admin record
    - Prevents unauthorized access to admin records
    - Maintains proper data isolation
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Allow authenticated users to read admin records" ON admin;
DROP POLICY IF EXISTS "Only service role can modify admin records" ON admin;

-- Create new policies
CREATE POLICY "Users can read their own admin status"
ON admin
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Only service role can modify admin records"
ON admin
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);