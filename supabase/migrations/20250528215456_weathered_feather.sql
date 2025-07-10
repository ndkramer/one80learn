/*
  # Fix RLS Policies with Existence Checks

  1. Changes
    - Drop existing policies safely
    - Create new policies only if they don't exist
    - Fix admin access using email() function
    - Maintain proper access control hierarchy

  2. Security
    - Preserve data isolation
    - Enable proper access patterns
    - Fix permission issues
*/

-- Drop all existing policies
DROP POLICY IF EXISTS "enable_class_access" ON classes;
DROP POLICY IF EXISTS "enable_enrollment_access" ON enrollments;
DROP POLICY IF EXISTS "enable_module_access" ON modules;
DROP POLICY IF EXISTS "enable_resource_access" ON resources;
DROP POLICY IF EXISTS "enable_note_access" ON notes;
DROP POLICY IF EXISTS "enable_module_progress_access" ON module_progress;
DROP POLICY IF EXISTS "admin_override_classes" ON classes;
DROP POLICY IF EXISTS "admin_override_enrollments" ON enrollments;
DROP POLICY IF EXISTS "admin_override_modules" ON modules;
DROP POLICY IF EXISTS "admin_override_resources" ON resources;
DROP POLICY IF EXISTS "admin_override_notes" ON notes;
DROP POLICY IF EXISTS "admin_override_module_progress" ON module_progress;
DROP POLICY IF EXISTS "manage_own_classes" ON classes;
DROP POLICY IF EXISTS "view_enrolled_classes" ON classes;
DROP POLICY IF EXISTS "manage_own_enrollments" ON enrollments;
DROP POLICY IF EXISTS "view_class_enrollments" ON enrollments;
DROP POLICY IF EXISTS "manage_class_modules" ON modules;
DROP POLICY IF EXISTS "view_enrolled_modules" ON modules;
DROP POLICY IF EXISTS "manage_module_resources" ON resources;
DROP POLICY IF EXISTS "view_module_resources" ON resources;
DROP POLICY IF EXISTS "manage_own_notes" ON notes;
DROP POLICY IF EXISTS "manage_own_progress" ON module_progress;
DROP POLICY IF EXISTS "view_student_progress" ON module_progress;

DO $$ 
BEGIN
  -- Classes policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'manage_own_classes'
    AND tablename = 'classes'
  ) THEN
    CREATE POLICY "manage_own_classes"
    ON classes
    FOR ALL
    TO authenticated
    USING (instructor_id = auth.uid())
    WITH CHECK (instructor_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'view_enrolled_classes'
    AND tablename = 'classes'
  ) THEN
    CREATE POLICY "view_enrolled_classes"
    ON classes
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM enrollments
        WHERE enrollments.class_id = classes.id
        AND enrollments.user_id = auth.uid()
        AND enrollments.status = 'active'
      )
    );
  END IF;

  -- Enrollments policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'manage_own_enrollments'
    AND tablename = 'enrollments'
  ) THEN
    CREATE POLICY "manage_own_enrollments"
    ON enrollments
    FOR ALL
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'view_class_enrollments'
    AND tablename = 'enrollments'
  ) THEN
    CREATE POLICY "view_class_enrollments"
    ON enrollments
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM classes
        WHERE classes.id = enrollments.class_id
        AND classes.instructor_id = auth.uid()
      )
    );
  END IF;

  -- Modules policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'manage_class_modules'
    AND tablename = 'modules'
  ) THEN
    CREATE POLICY "manage_class_modules"
    ON modules
    FOR ALL
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM classes
        WHERE classes.id = modules.class_id
        AND classes.instructor_id = auth.uid()
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM classes
        WHERE classes.id = modules.class_id
        AND classes.instructor_id = auth.uid()
      )
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'view_enrolled_modules'
    AND tablename = 'modules'
  ) THEN
    CREATE POLICY "view_enrolled_modules"
    ON modules
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM enrollments
        WHERE enrollments.class_id = modules.class_id
        AND enrollments.user_id = auth.uid()
        AND enrollments.status = 'active'
      )
    );
  END IF;

  -- Resources policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'manage_module_resources'
    AND tablename = 'resources'
  ) THEN
    CREATE POLICY "manage_module_resources"
    ON resources
    FOR ALL
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM modules m
        JOIN classes c ON c.id = m.class_id
        WHERE m.id = resources.module_id
        AND c.instructor_id = auth.uid()
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM modules m
        JOIN classes c ON c.id = m.class_id
        WHERE m.id = resources.module_id
        AND c.instructor_id = auth.uid()
      )
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'view_module_resources'
    AND tablename = 'resources'
  ) THEN
    CREATE POLICY "view_module_resources"
    ON resources
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM modules m
        JOIN enrollments e ON e.class_id = m.class_id
        WHERE m.id = resources.module_id
        AND e.user_id = auth.uid()
        AND e.status = 'active'
      )
    );
  END IF;

  -- Notes policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'manage_own_notes'
    AND tablename = 'notes'
  ) THEN
    CREATE POLICY "manage_own_notes"
    ON notes
    FOR ALL
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
  END IF;

  -- Module progress policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'manage_own_progress'
    AND tablename = 'module_progress'
  ) THEN
    CREATE POLICY "manage_own_progress"
    ON module_progress
    FOR ALL
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'view_student_progress'
    AND tablename = 'module_progress'
  ) THEN
    CREATE POLICY "view_student_progress"
    ON module_progress
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM modules m
        JOIN classes c ON c.id = m.class_id
        WHERE m.id = module_progress.module_id
        AND c.instructor_id = auth.uid()
      )
    );
  END IF;

  -- Admin override policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'admin_override_classes'
    AND tablename = 'classes'
  ) THEN
    CREATE POLICY "admin_override_classes"
    ON classes FOR ALL
    TO authenticated
    USING (auth.email() = 'Nick@one80services.com')
    WITH CHECK (auth.email() = 'Nick@one80services.com');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'admin_override_enrollments'
    AND tablename = 'enrollments'
  ) THEN
    CREATE POLICY "admin_override_enrollments"
    ON enrollments FOR ALL
    TO authenticated
    USING (auth.email() = 'Nick@one80services.com')
    WITH CHECK (auth.email() = 'Nick@one80services.com');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'admin_override_modules'
    AND tablename = 'modules'
  ) THEN
    CREATE POLICY "admin_override_modules"
    ON modules FOR ALL
    TO authenticated
    USING (auth.email() = 'Nick@one80services.com')
    WITH CHECK (auth.email() = 'Nick@one80services.com');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'admin_override_resources'
    AND tablename = 'resources'
  ) THEN
    CREATE POLICY "admin_override_resources"
    ON resources FOR ALL
    TO authenticated
    USING (auth.email() = 'Nick@one80services.com')
    WITH CHECK (auth.email() = 'Nick@one80services.com');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'admin_override_notes'
    AND tablename = 'notes'
  ) THEN
    CREATE POLICY "admin_override_notes"
    ON notes FOR ALL
    TO authenticated
    USING (auth.email() = 'Nick@one80services.com')
    WITH CHECK (auth.email() = 'Nick@one80services.com');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'admin_override_module_progress'
    AND tablename = 'module_progress'
  ) THEN
    CREATE POLICY "admin_override_module_progress"
    ON module_progress FOR ALL
    TO authenticated
    USING (auth.email() = 'Nick@one80services.com')
    WITH CHECK (auth.email() = 'Nick@one80services.com');
  END IF;
END $$;