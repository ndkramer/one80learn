/*
  # Storage Policies for PDF Slides

  1. Changes
    - Creates slides-pdf storage bucket
    - Sets up storage policies for PDF files
    - Fixes type casting between text and UUID for auth.uid()
  
  2. Security
    - Public read access for all PDFs
    - Authenticated users can upload PDFs
    - Users can only update/delete their own files
*/

-- Create the storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('slides-pdf', 'slides-pdf', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
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

-- Authenticated users can upload PDFs
CREATE POLICY "Authenticated Upload Access for slides-pdf"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'slides-pdf'
  AND (storage.foldername(name))[1] != 'private'
  AND LOWER(storage.extension(name)) = 'pdf'
);

-- Authenticated users can update their own files
CREATE POLICY "Authenticated Update Access for slides-pdf"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'slides-pdf'
  AND owner_id::text = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'slides-pdf'
  AND owner_id::text = auth.uid()::text
);

-- Authenticated users can delete their own files
CREATE POLICY "Authenticated Delete Access for slides-pdf"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'slides-pdf'
  AND owner_id::text = auth.uid()::text
);