/*
  # Fix RLS policies for classes table

  1. Changes
    - Drop existing RLS policies that reference the users table directly
    - Create new policies using auth.email() and auth.uid() functions
    - Maintain existing functionality but with proper security

  2. Security
    - Enable RLS on classes table
    - Add policies for:
      - Admin full access
      - Instructor management
      - Student viewing
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Admin can manage all classes" ON classes;
DROP POLICY IF EXISTS "Classes are viewable by authenticated users" ON classes;
DROP POLICY IF EXISTS "Instructors manage classes" ON classes;

-- Create new policies using proper auth functions
CREATE POLICY "admin_full_access"
ON public.classes
FOR ALL
TO authenticated
USING (auth.email() = 'Nick@one80services.com')
WITH CHECK (auth.email() = 'Nick@one80services.com');

CREATE POLICY "instructor_manage_own_classes"
ON public.classes
FOR ALL 
TO authenticated
USING (instructor_id = auth.uid())
WITH CHECK (instructor_id = auth.uid());

CREATE POLICY "authenticated_users_view_classes"
ON public.classes
FOR SELECT
TO authenticated
USING (true);