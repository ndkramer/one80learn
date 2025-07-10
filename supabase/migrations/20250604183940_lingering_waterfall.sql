/*
  # Update Storage Policies for PDF Uploads
  
  1. Changes
    - Drop existing storage policies
    - Create new policies for authenticated users
    - Fix type casting for owner_id comparison with auth.uid()
  
  2. Security
    - Allow public read access to slides-pdf bucket
    - Restrict uploads to PDF files only
    - Limit file size to 10MB
    - Prevent uploads to private folder
    - Users can only modify/delete their own files
*/

-- Create the storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('slides-pdf', 'slides-pdf', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Instructor Upload Access" ON storage.objects;
DROP POLICY IF EXISTS "Instructor Delete Access" ON storage.objects;

-- Create new policies

-- Public read access policy
CREATE POLICY "Public Read Access for slides-pdf"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'slides-pdf');

-- Authenticated users can upload PDFs
CREATE POLICY "Authenticated Upload Access for slides-pdf"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'slides-pdf'
  AND (storage.foldername(name))[1] != 'private'
  AND LOWER(storage.extension(name)) = 'pdf'
  AND (CAST(metadata->>'size' AS bigint) < 10485760)
);

-- Authenticated users can update their own files
CREATE POLICY "Authenticated Update Access for slides-pdf"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'slides-pdf'
  AND owner = auth.uid()
)
WITH CHECK (
  bucket_id = 'slides-pdf'
  AND owner = auth.uid()
);

-- Authenticated users can delete their own files
CREATE POLICY "Authenticated Delete Access for slides-pdf"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'slides-pdf'
  AND owner = auth.uid()
);