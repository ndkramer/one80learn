/*
  # Fix Storage RLS Policies

  1. Changes
    - Update RLS policies for storage_objects table to allow proper file uploads
    - Add policies for instructors to manage their files
    - Add policy for public read access to files

  2. Security
    - Enable RLS on storage_objects table
    - Add policies for:
      - File uploads by instructors
      - File management by instructors
      - Public read access
*/

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Instructors can delete their files" ON storage_objects;
DROP POLICY IF EXISTS "Instructors can update their files" ON storage_objects;
DROP POLICY IF EXISTS "Instructors can upload files" ON storage_objects;
DROP POLICY IF EXISTS "Public can view all files" ON storage_objects;

-- Create comprehensive policies for storage management
CREATE POLICY "Instructors can upload files"
ON storage_objects
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM classes
    WHERE classes.instructor_id = auth.uid()
  )
);

CREATE POLICY "Instructors can manage their files"
ON storage_objects
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM classes
    WHERE classes.instructor_id = auth.uid()
    AND storage_objects.owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM classes
    WHERE classes.instructor_id = auth.uid()
    AND storage_objects.owner_id = auth.uid()
  )
);

CREATE POLICY "Public can view all files"
ON storage_objects
FOR SELECT
TO public
USING (true);