/*
  # Remove Admin Functionality
  
  1. Changes
    - Drop admin_users table
    - Remove admin-related data
    
  2. Security
    - Maintain existing user security
    - Preserve data integrity
*/

-- Drop admin_users table
DROP TABLE IF EXISTS admin_users CASCADE;