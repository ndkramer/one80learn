/*
  # Add Storage Bucket for Slides
  
  1. Changes
    - Create slides storage bucket
    - Add policies for authenticated users
    - Enable proper file access control
    
  2. Security
    - Allow authenticated users to read all slides
    - Users can manage their own uploads
*/

-- Create slides bucket
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('slides', 'slides', false)
  ON CONFLICT (id) DO NOTHING;
END $$;

-- Create policies for storage.objects
DO $$ 
BEGIN
  -- Policy to allow authenticated users to read any slide
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Allow authenticated users to read slides'
    AND tablename = 'objects'
    AND schemaname = 'storage'
  ) THEN
    CREATE POLICY "Allow authenticated users to read slides"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (bucket_id = 'slides');
  END IF;

  -- Policy to allow authenticated users to upload slides
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Allow authenticated users to upload slides'
    AND tablename = 'objects'
    AND schemaname = 'storage'
  ) THEN
    CREATE POLICY "Allow authenticated users to upload slides"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'slides');
  END IF;

  -- Policy to allow authenticated users to update their own slides
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Allow authenticated users to update their own slides'
    AND tablename = 'objects'
    AND schemaname = 'storage'
  ) THEN
    CREATE POLICY "Allow authenticated users to update their own slides"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (bucket_id = 'slides' AND owner = auth.uid())
    WITH CHECK (bucket_id = 'slides' AND owner = auth.uid());
  END IF;

  -- Policy to allow authenticated users to delete their own slides
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Allow authenticated users to delete their own slides'
    AND tablename = 'objects'
    AND schemaname = 'storage'
  ) THEN
    CREATE POLICY "Allow authenticated users to delete their own slides"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'slides' AND owner = auth.uid());
  END IF;
END $$;