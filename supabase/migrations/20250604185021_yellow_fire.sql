/*
  # Allow all authenticated users to upload PDFs

  1. Changes
    - Modify storage policies to allow all authenticated users to upload PDFs
    - Remove instructor-specific restrictions
    - Maintain public read access
    - Keep file type restriction to PDFs only

  2. Security
    - Maintains public read access for all files
    - Allows any authenticated user to upload PDFs
    - Users can only modify their own files
    - Enforces PDF file type restriction
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Public Read Access for slides-pdf" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload Access for slides-pdf" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update Access for slides-pdf" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete Access for slides-pdf" ON storage.objects;

-- Create new policies

-- Public read access policy
CREATE POLICY "Public Read Access for slides-pdf"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'slides-pdf');

-- Any authenticated user can upload PDFs
CREATE POLICY "Authenticated Upload Access for slides-pdf"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'slides-pdf'
  AND LOWER(storage.extension(name)) = 'pdf'
);

-- Users can update their own files
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

-- Users can delete their own files
CREATE POLICY "Authenticated Delete Access for slides-pdf"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'slides-pdf'
  AND owner = auth.uid()
);