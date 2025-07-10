/*
  # Create Storage Bucket for Course Thumbnails
  
  1. New Storage Configuration
    - Creates 'course-thumbnails' bucket for storing thumbnail images
    - Sets bucket as public for easy access
  
  2. Security Policies
    - Allows public read access to all thumbnails
    - Restricts uploads to authenticated users only
    - Allows users to manage their own uploaded files
    - Supports common image formats (jpg, jpeg, png, gif, webp)
*/

-- Create the storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('course-thumbnails', 'course-thumbnails', true)
ON CONFLICT (id) DO NOTHING;

-- Policy for public read access
CREATE POLICY "Public read access for course thumbnails"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'course-thumbnails');

-- Policy for authenticated users to upload images
CREATE POLICY "Authenticated upload access for course thumbnails"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'course-thumbnails'
  AND LOWER(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'gif', 'webp')
  AND (CAST(metadata->>'size' AS bigint) < 5242880) -- 5MB limit
);

-- Policy for authenticated users to update their own files
CREATE POLICY "Authenticated update own course thumbnails"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'course-thumbnails'
  AND owner = auth.uid()
)
WITH CHECK (
  bucket_id = 'course-thumbnails'
  AND owner = auth.uid()
);

-- Policy for authenticated users to delete their own files
CREATE POLICY "Authenticated delete own course thumbnails"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'course-thumbnails'
  AND owner = auth.uid()
);