/*
  # Remove All RLS Policies
  
  1. Changes
    - Drop all existing RLS policies from all tables
    - Keep RLS enabled on tables
    - Prepare for systematic reintroduction of policies
    
  2. Security
    - Tables remain RLS-enabled
    - Temporary state before reintroducing policies
*/

-- Drop all policies from classes table
DROP POLICY IF EXISTS "admin_full_access" ON classes;
DROP POLICY IF EXISTS "instructors_manage_own_courses" ON classes;
DROP POLICY IF EXISTS "students_view_enrolled_courses" ON classes;
DROP POLICY IF EXISTS "authenticated_users_view_classes" ON classes;

-- Drop all policies from modules table
DROP POLICY IF EXISTS "admin_full_access" ON modules;
DROP POLICY IF EXISTS "instructor_manage_modules" ON modules;
DROP POLICY IF EXISTS "student_view_enrolled_modules" ON modules;

-- Drop all policies from resources table
DROP POLICY IF EXISTS "admin_full_access" ON resources;
DROP POLICY IF EXISTS "instructor_manage_resources" ON resources;
DROP POLICY IF EXISTS "enable_read_access_for_authenticated_users" ON resources;

-- Drop all policies from notes table
DROP POLICY IF EXISTS "admin_full_access" ON notes;
DROP POLICY IF EXISTS "instructor_view_notes" ON notes;
DROP POLICY IF EXISTS "users_manage_own_notes" ON notes;

-- Drop all policies from enrollments table
DROP POLICY IF EXISTS "enable_read_for_users" ON enrollments;
DROP POLICY IF EXISTS "enable_insert_for_users" ON enrollments;
DROP POLICY IF EXISTS "enable_update_for_users" ON enrollments;
DROP POLICY IF EXISTS "enable_delete_for_users" ON enrollments;

-- Drop all policies from module_progress table
DROP POLICY IF EXISTS "admin_full_access" ON module_progress;
DROP POLICY IF EXISTS "users_manage_own_progress" ON module_progress;
DROP POLICY IF EXISTS "view_module_progress" ON module_progress;