/*
  # Add Fourth Sample Class

  1. New Data
    - Add a new class "Machine Learning Fundamentals"
    - Add three modules for the class
    - Add resources for the first module
    - Create enrollment for admin user

  2. Changes
    - Insert new class record
    - Insert associated modules
    - Insert module resources
    - Create enrollment record
*/

-- Insert the new class
INSERT INTO classes (
  id,
  title,
  description,
  instructor_id,
  thumbnail_url,
  instructor_image,
  instructor_bio,
  schedule_data
) VALUES (
  '44444444-4444-4444-4444-444444444444',
  'Machine Learning Fundamentals',
  'Explore the foundations of machine learning, including supervised and unsupervised learning, neural networks, and practical applications.',
  (SELECT id FROM auth.users WHERE email = 'admin@example.com'),
  'https://images.pexels.com/photos/8386440/pexels-photo-8386440.jpeg',
  'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg',
  'Nick is a passionate educator and tech enthusiast with over a decade of experience in software development and AI technologies.',
  '{
    "startDate": "2024-09-16",
    "endDate": "2024-09-17",
    "startTime": "09:00",
    "endTime": "16:00",
    "timeZone": "CST",
    "location": "Zoom Virtual Classroom"
  }'::jsonb
);

-- Insert modules for the new class
INSERT INTO modules (id, class_id, title, description, slide_url, "order")
VALUES
  (
    'dddddddd-1111-1111-1111-dddddddddddd',
    '44444444-4444-4444-4444-444444444444',
    'Introduction to Machine Learning',
    'Understanding the basic concepts and types of machine learning.',
    'https://docs.google.com/presentation/d/1uMtpUazokJpshYfkOO7-opH9xBAJR7s_5MFj2aWfSfw/embed?start=false&loop=false&delayms=3000',
    1
  ),
  (
    'dddddddd-2222-2222-2222-dddddddddddd',
    '44444444-4444-4444-4444-444444444444',
    'Supervised Learning Techniques',
    'Deep dive into classification and regression algorithms.',
    'https://docs.google.com/presentation/d/1uMtpUazokJpshYfkOO7-opH9xBAJR7s_5MFj2aWfSfw/embed?start=false&loop=false&delayms=3000',
    2
  ),
  (
    'dddddddd-3333-3333-3333-dddddddddddd',
    '44444444-4444-4444-4444-444444444444',
    'Neural Networks and Deep Learning',
    'Understanding neural network architectures and training methodologies.',
    'https://docs.google.com/presentation/d/1uMtpUazokJpshYfkOO7-opH9xBAJR7s_5MFj2aWfSfw/embed?start=false&loop=false&delayms=3000',
    3
  );

-- Insert resources for the first module
INSERT INTO resources (module_id, title, type, url, description)
VALUES
  (
    'dddddddd-1111-1111-1111-dddddddddddd',
    'Machine Learning Basics PDF',
    'pdf',
    'https://example.com/ml-basics.pdf',
    'A comprehensive introduction to machine learning concepts'
  ),
  (
    'dddddddd-1111-1111-1111-dddddddddddd',
    'Python for ML Tutorial',
    'link',
    'https://scikit-learn.org/stable/tutorial/basic/tutorial.html',
    'Interactive tutorial for machine learning with Python'
  );

-- Enroll admin user in the new class
INSERT INTO enrollments (user_id, class_id, status)
SELECT 
  (SELECT id FROM auth.users WHERE email = 'admin@example.com'),
  '44444444-4444-4444-4444-444444444444',
  'active';