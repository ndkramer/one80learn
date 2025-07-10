/*
  # Fix Password Reset Email Template
  
  1. Changes
    - Create a table to store password reset template instructions
    - Add instructions for updating the email templates in Supabase dashboard
    
  2. Security
    - No security changes, just documentation
*/

-- Create a table to store password reset template instructions
CREATE TABLE IF NOT EXISTS password_reset_template_instructions (
  id serial PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  instructions text
);

-- Insert instructions
INSERT INTO password_reset_template_instructions (instructions)
VALUES (
  'Please update the password reset email templates in the Supabase dashboard:

1. Go to Authentication > Email Templates > Password Reset
2. Update the text template to:
   Reset your password for {{ .SiteURL }}

   Someone (hopefully you) has requested a password reset for your account.
   Click the link below to reset your password:

   {{ .SiteURL }}/reset-password?token={{ .Token }}&type=recovery

   If you didn''t request this email, there''s nothing to worry about - you can safely ignore it.

3. Update the HTML template to:
   <h2>Reset your password for {{ .SiteURL }}</h2>
   <p>Someone (hopefully you) has requested a password reset for your account.</p>
   <p>Click the link below to reset your password:</p>
   <p><a href="{{ .SiteURL }}/reset-password?token={{ .Token }}&type=recovery">Reset Password</a></p>
   <p>If you didn''t request this email, there''s nothing to worry about - you can safely ignore it.</p>'
);

-- Output the instructions as a notice
DO $$
BEGIN
  RAISE NOTICE '
  =====================================================================
  PASSWORD RESET TEMPLATE UPDATE REQUIRED
  =====================================================================
  
  Please update the password reset email templates in the Supabase dashboard:
  
  1. Go to Authentication > Email Templates > Password Reset
  2. Update the text template to:
     Reset your password for {{ .SiteURL }}
  
     Someone (hopefully you) has requested a password reset for your account.
     Click the link below to reset your password:
  
     {{ .SiteURL }}/reset-password?token={{ .Token }}&type=recovery
  
     If you didn''t request this email, there''s nothing to worry about - you can safely ignore it.
  
  3. Update the HTML template to:
     <h2>Reset your password for {{ .SiteURL }}</h2>
     <p>Someone (hopefully you) has requested a password reset for your account.</p>
     <p>Click the link below to reset your password:</p>
     <p><a href="{{ .SiteURL }}/reset-password?token={{ .Token }}&type=recovery">Reset Password</a></p>
     <p>If you didn''t request this email, there''s nothing to worry about - you can safely ignore it.</p>
  ';
END $$;