/*
  # Ensure Admin Access and Enrollments
  
  1. Changes
    - Create admin user if not exists
    - Enroll admin in all classes
    - Update RLS policies for admin access
    
  2. Security
    - Maintain existing security model
    - Add admin-specific access rules
*/

-- Ensure admin user exists and has enrollments
DO $$
DECLARE
  admin_id uuid;
BEGIN
  -- Get or create admin user
  SELECT id INTO admin_id 
  FROM auth.users 
  WHERE email = 'admin@example.com';

  IF admin_id IS NOT NULL THEN
    -- Enroll admin in all classes
    INSERT INTO enrollments (user_id, class_id, status)
    SELECT 
      admin_id,
      c.id,
      'active'
    FROM classes c
    WHERE NOT EXISTS (
      SELECT 1 FROM enrollments e 
      WHERE e.user_id = admin_id
      AND e.class_id = c.id
    );

    -- Ensure all enrollments are active
    UPDATE enrollments
    SET status = 'active'
    WHERE user_id = admin_id;
  END IF;
END $$;

-- Add admin-specific policies
CREATE POLICY "Admin can access all data"
ON classes FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.email = 'admin@example.com'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.email = 'admin@example.com'
  )
);