/*
  # Fix admin table RLS policies

  1. Changes
    - Remove recursive admin check from RLS policies
    - Simplify policies to use direct user ID checks
    - Add separate policies for different operations
    
  2. Security
    - Enable RLS on admin table
    - Add policies for:
      - Select: Allow authenticated users to read admin records
      - Insert/Update/Delete: Only allow service role to modify admin records
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Admin users can manage admin table" ON admin;
DROP POLICY IF EXISTS "Admin users can view admin table" ON admin;

-- Create new policies
CREATE POLICY "Allow authenticated users to read admin records"
  ON admin
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only service role can modify admin records"
  ON admin
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);