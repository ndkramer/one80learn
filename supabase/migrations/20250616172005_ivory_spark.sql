/*
  # Setup Course Thumbnails Storage Bucket
  
  1. Changes
    - Create course-thumbnails storage bucket
    - Configure bucket settings for image uploads
    - Note: RLS policies for storage are managed automatically by Supabase
    
  2. Security
    - Bucket is set to public for read access
    - File size limited to 5MB
    - Only image MIME types allowed
*/

-- Create the storage bucket for course thumbnails if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'course-thumbnails',
  'course-thumbnails', 
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];