/*
  # Create Course Thumbnails Storage Bucket
  
  1. Changes
    - Create course-thumbnails storage bucket
    - Set bucket as public for thumbnail access
    
  2. Security
    - Bucket policies need to be configured through Supabase Dashboard
    - See instructions below for manual policy setup
*/

-- Create the course-thumbnails bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES (
  'course-thumbnails',
  'course-thumbnails', 
  true
)
ON CONFLICT (id) DO NOTHING;

/*
  IMPORTANT: Storage policies cannot be created via SQL migrations.
  Please configure the following policies manually in the Supabase Dashboard:
  
  Go to Storage > Policies and create these policies for the 'course-thumbnails' bucket:
  
  1. Policy Name: "Authenticated users can upload course thumbnails"
     Operation: INSERT
     Target roles: authenticated
     Policy definition: bucket_id = 'course-thumbnails'
  
  2. Policy Name: "Authenticated users can update course thumbnails"
     Operation: UPDATE
     Target roles: authenticated
     Policy definition: bucket_id = 'course-thumbnails'
  
  3. Policy Name: "Public can view course thumbnails"
     Operation: SELECT
     Target roles: public
     Policy definition: bucket_id = 'course-thumbnails'
  
  4. Policy Name: "Authenticated users can delete course thumbnails"
     Operation: DELETE
     Target roles: authenticated
     Policy definition: bucket_id = 'course-thumbnails'
*/