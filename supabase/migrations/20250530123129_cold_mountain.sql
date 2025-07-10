/*
  # Add admin records for all users
  
  1. Changes
    - Insert admin records for all users in auth.users
    - Set admin = 'N' for new records
    - Skip existing records to preserve current admin settings
    
  2. Security
    - Maintain existing admin records
    - Ensure all users have an admin record
*/

-- Insert admin records for all users who don't have one
INSERT INTO admin (user_id, admin)
SELECT 
  id,
  'N'
FROM auth.users
WHERE id NOT IN (
  SELECT user_id FROM admin
);