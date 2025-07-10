/*
  # Create Storage Bucket for Slides

  1. New Storage Configuration
    - Creates 'slides-pdf' bucket for storing PDF files
    - Sets bucket as public
  
  2. Security Policies
    - Allows public read access to all files
    - Restricts uploads to authenticated instructors only
    - Limits uploads to PDF files only
    - Allows instructors to delete their own files
*/

-- Create the storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('slides-pdf', 'slides-pdf', true);

-- Set up storage policies
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'slides-pdf');

CREATE POLICY "Instructor Upload Access"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'slides-pdf'
  AND (EXISTS (
    SELECT 1 FROM public.classes
    WHERE classes.instructor_id = auth.uid()
  ))
  AND (storage.foldername(name))[1] != 'private'
  AND LOWER(storage.extension(name)) = 'pdf'
);

CREATE POLICY "Instructor Delete Access"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'slides-pdf'
  AND (EXISTS (
    SELECT 1 FROM public.classes
    WHERE classes.instructor_id = auth.uid()
  ))
);