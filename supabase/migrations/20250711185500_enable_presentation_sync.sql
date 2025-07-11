-- Migration: Enable presentation sync for modules with PDFs and ensure proper instructor assignment
-- Created: 2024-07-11

-- First, ensure Nick@one80labs.com is properly set up as super admin and instructor
DO $$
DECLARE
    nick_user_id UUID;
BEGIN
    -- Find Nick's user ID
    SELECT id INTO nick_user_id 
    FROM auth.users 
    WHERE email = 'nick@one80labs.com';
    
    IF nick_user_id IS NOT NULL THEN
        -- Update user metadata to include super admin flag
        UPDATE auth.users 
        SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"is_super_admin": true}'::jsonb
        WHERE id = nick_user_id;
        
        -- Set Nick as instructor for all existing courses
        UPDATE classes 
        SET instructor_id = nick_user_id 
        WHERE instructor_id IS NULL OR instructor_id != nick_user_id;
        
        -- Ensure Nick is enrolled in all courses
        INSERT INTO enrollments (user_id, class_id, status, enrolled_at)
        SELECT nick_user_id, id, 'active', NOW()
        FROM classes
        WHERE id NOT IN (
            SELECT class_id 
            FROM enrollments 
            WHERE user_id = nick_user_id
        );
        
        RAISE LOG 'Updated Nick@one80labs.com as super admin and instructor for all courses';
    ELSE
        RAISE LOG 'User nick@one80labs.com not found - migration skipped';
    END IF;
END $$;

-- Enable presentation sync for all modules that have PDFs
UPDATE modules 
SET supports_sync = true 
WHERE slide_pdf_url IS NOT NULL 
  AND slide_pdf_url != '' 
  AND (supports_sync IS NULL OR supports_sync = false);

-- Add a comment to track which modules were updated
COMMENT ON COLUMN modules.supports_sync IS 'Enables real-time presentation synchronization for modules with PDF slides';

-- Create index for better performance on sync queries
CREATE INDEX IF NOT EXISTS idx_modules_supports_sync ON modules(supports_sync) WHERE supports_sync = true;

-- Log completion
DO $$
DECLARE
    modules_updated INTEGER;
BEGIN
    SELECT COUNT(*) INTO modules_updated 
    FROM modules 
    WHERE supports_sync = true;
    
    RAISE LOG 'Migration completed - % modules now support presentation sync', modules_updated;
END $$; 