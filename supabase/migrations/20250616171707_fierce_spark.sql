/*
  # Create course thumbnails storage bucket
  
  1. Changes
    - Create course-thumbnails storage bucket
    - Set bucket as public for easy access
    - Configure file size and type restrictions
    
  2. Security
    - Bucket is public for read access
    - File size limited to 5MB
    - Only image files allowed
*/

-- Create the course-thumbnails bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'course-thumbnails',
  'course-thumbnails',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;