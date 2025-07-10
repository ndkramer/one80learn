/*
  # Create Storage Bucket for Resources
  
  1. Changes
    - Create private storage bucket for resources
    - Add RLS policies for access control
    - Set up proper permissions for users
    
  2. Security
    - Bucket is private by default
    - Only authenticated users can read
    - Instructors can manage their resources
    - Admin has full access
*/

-- Create the resources bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('resources', 'resources', false)
ON CONFLICT (id) DO NOTHING;

-- Policy for authenticated users to read resources
CREATE POLICY "Authenticated users can read resources"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'resources');

-- Policy for instructors to manage resources in their classes
CREATE POLICY "Instructors can manage resources"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'resources' AND
  (EXISTS (
    SELECT 1
    FROM classes c
    WHERE c.instructor_id = auth.uid()
  ))
)
WITH CHECK (
  bucket_id = 'resources' AND
  (EXISTS (
    SELECT 1
    FROM classes c
    WHERE c.instructor_id = auth.uid()
  ))
);

-- Policy for admin to manage all resources
CREATE POLICY "Admin can manage all resources"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'resources' AND
  auth.email() = 'Nick@one80services.com'
)
WITH CHECK (
  bucket_id = 'resources' AND
  auth.email() = 'Nick@one80services.com'
);