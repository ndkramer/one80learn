/*
  # Initial Data Migration
  
  1. Data Population
    - Classes with schedule information
    - Modules with proper ordering
    - Resources for learning materials
    - Initial enrollments for admin user
*/

-- Insert initial classes
INSERT INTO classes (id, title, description, instructor_id, thumbnail_url, instructor_image, instructor_bio, schedule_data)
VALUES
  (
    '11111111-1111-1111-1111-111111111111',
    'Introduction to Computer Science',
    'Learn the fundamentals of computer science, including algorithms, data structures, and programming concepts.',
    (SELECT id FROM auth.users WHERE email = 'admin@example.com'),
    'https://images.pexels.com/photos/546819/pexels-photo-546819.jpeg',
    'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg',
    'Nick is a passionate educator and tech enthusiast with over a decade of experience in software development and AI technologies.',
    '{"startDate": "2024-06-17", "endDate": "2024-06-18", "startTime": "09:00", "endTime": "16:00", "timeZone": "CST", "location": "Zoom Virtual Classroom"}'::jsonb
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'Web Development Fundamentals',
    'Master the basics of web development with HTML, CSS, and JavaScript.',
    (SELECT id FROM auth.users WHERE email = 'admin@example.com'),
    'https://images.pexels.com/photos/270348/pexels-photo-270348.jpeg',
    'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg',
    'Nick is a passionate educator and tech enthusiast with over a decade of experience in software development and AI technologies.',
    '{"startDate": "2024-07-15", "endDate": "2024-07-16", "startTime": "09:00", "endTime": "16:00", "timeZone": "CST", "location": "Zoom Virtual Classroom"}'::jsonb
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    'Data Science and Analytics',
    'Learn how to analyze and interpret complex data using statistical methods and visualization techniques.',
    (SELECT id FROM auth.users WHERE email = 'admin@example.com'),
    'https://images.pexels.com/photos/669615/pexels-photo-669615.jpeg',
    'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg',
    'Nick is a passionate educator and tech enthusiast with over a decade of experience in software development and AI technologies.',
    '{"startDate": "2024-08-12", "endDate": "2024-08-13", "startTime": "09:00", "endTime": "16:00", "timeZone": "CST", "location": "Zoom Virtual Classroom"}'::jsonb
  );

-- Insert modules for Introduction to Computer Science
INSERT INTO modules (id, class_id, title, description, slide_url, "order")
VALUES
  (
    'aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa',
    '11111111-1111-1111-1111-111111111111',
    'Getting Started with Programming',
    'An introduction to programming concepts and tools.',
    'https://docs.google.com/presentation/d/1uMtpUazokJpshYfkOO7-opH9xBAJR7s_5MFj2aWfSfw/embed?start=false&loop=false&delayms=3000',
    1
  ),
  (
    'aaaaaaaa-2222-2222-2222-aaaaaaaaaaaa',
    '11111111-1111-1111-1111-111111111111',
    'Variables and Data Types',
    'Understanding variables, constants, and different data types.',
    'https://docs.google.com/presentation/d/1uMtpUazokJpshYfkOO7-opH9xBAJR7s_5MFj2aWfSfw/embed?start=false&loop=false&delayms=3000',
    2
  ),
  (
    'aaaaaaaa-3333-3333-3333-aaaaaaaaaaaa',
    '11111111-1111-1111-1111-111111111111',
    'Control Flow and Loops',
    'How to control program flow using conditionals and loops.',
    'https://docs.google.com/presentation/d/1uMtpUazokJpshYfkOO7-opH9xBAJR7s_5MFj2aWfSfw/embed?start=false&loop=false&delayms=3000',
    3
  );

-- Insert modules for Web Development Fundamentals
INSERT INTO modules (id, class_id, title, description, slide_url, "order")
VALUES
  (
    'bbbbbbbb-1111-1111-1111-bbbbbbbbbbbb',
    '22222222-2222-2222-2222-222222222222',
    'HTML Basics',
    'Introduction to HTML and document structure.',
    'https://gamma.app/embed/Data-Driven-Solutions-Proposal-4ngwnu4gbx1i4n9',
    1
  ),
  (
    'bbbbbbbb-2222-2222-2222-bbbbbbbbbbbb',
    '22222222-2222-2222-2222-222222222222',
    'CSS Styling',
    'How to style web pages using CSS.',
    'https://gamma.app/embed/Data-Driven-Solutions-Proposal-4ngwnu4gbx1i4n9',
    2
  ),
  (
    'bbbbbbbb-3333-3333-3333-bbbbbbbbbbbb',
    '22222222-2222-2222-2222-222222222222',
    'JavaScript Fundamentals',
    'Introduction to programming with JavaScript.',
    'https://gamma.app/embed/Data-Driven-Solutions-Proposal-4ngwnu4gbx1i4n9',
    3
  );

-- Insert modules for Data Science and Analytics
INSERT INTO modules (id, class_id, title, description, slide_url, "order")
VALUES
  (
    'cccccccc-1111-1111-1111-cccccccccccc',
    '33333333-3333-3333-3333-333333333333',
    'Introduction to Data Science',
    'Overview of data science concepts and applications.',
    'https://docs.google.com/presentation/d/1uMtpUazokJpshYfkOO7-opH9xBAJR7s_5MFj2aWfSfw/embed?start=false&loop=false&delayms=3000',
    1
  ),
  (
    'cccccccc-2222-2222-2222-cccccccccccc',
    '33333333-3333-3333-3333-333333333333',
    'Data Collection and Cleaning',
    'Methods for gathering and preparing data for analysis.',
    'https://docs.google.com/presentation/d/1uMtpUazokJpshYfkOO7-opH9xBAJR7s_5MFj2aWfSfw/embed?start=false&loop=false&delayms=3000',
    2
  ),
  (
    'cccccccc-3333-3333-3333-cccccccccccc',
    '33333333-3333-3333-3333-333333333333',
    'Statistical Analysis',
    'Basic statistical methods for data analysis.',
    'https://docs.google.com/presentation/d/1uMtpUazokJpshYfkOO7-opH9xBAJR7s_5MFj2aWfSfw/embed?start=false&loop=false&delayms=3000',
    3
  );

-- Insert resources
INSERT INTO resources (module_id, title, type, url, description)
VALUES
  (
    'aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa',
    'Programming Fundamentals PDF',
    'pdf',
    'https://example.com/programming-fundamentals.pdf',
    'A comprehensive guide to programming basics'
  ),
  (
    'aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa',
    'Code Practice Platform',
    'link',
    'https://codecademy.com',
    'Interactive platform for practicing code'
  );

-- Enroll admin user in all classes
INSERT INTO enrollments (user_id, class_id, status)
SELECT 
  (SELECT id FROM auth.users WHERE email = 'admin@example.com'),
  id,
  'active'
FROM classes;