/*
  # Add slide PDF support
  
  1. Changes
    - Add slide_pdf_url column to modules table
    - Create storage bucket for slide PDFs
    - Add RLS policies for storage access
    
  2. Security
    - Maintain data isolation
    - Allow proper access control for files
*/

-- Add slide_pdf_url column to modules table
ALTER TABLE modules
ADD COLUMN slide_pdf_url text;

-- Create storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('slides', 'slides', false)
ON CONFLICT (id) DO NOTHING;

-- Create policy to allow authenticated users to read slides
CREATE POLICY "Authenticated users can read slides"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'slides');

-- Create policy for instructors to manage slides
CREATE POLICY "Instructors can manage slides"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'slides' AND
  EXISTS (
    SELECT 1 FROM classes c
    JOIN modules m ON m.class_id = c.id
    WHERE c.instructor_id = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'slides' AND
  EXISTS (
    SELECT 1 FROM classes c
    JOIN modules m ON m.class_id = c.id
    WHERE c.instructor_id = auth.uid()
  )
);