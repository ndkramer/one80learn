/*
  # Enhanced Security Policies

  1. Security Updates
    - Add instructor management policies for classes
    - Add module management policies for instructors
    - Add resource management policies for instructors
    - Add student enrollment tracking
    - Add additional user role policies

  2. Access Controls
    - Instructors can manage their own classes
    - Instructors can manage modules in their classes
    - Instructors can manage resources in their modules
    - Students can only access enrolled classes
*/

-- Add instructor management policies for classes
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy 
    WHERE polname = 'Instructors can manage their own classes'
  ) THEN
    CREATE POLICY "Instructors can manage their own classes"
      ON classes
      FOR ALL
      TO authenticated
      USING (instructor_id = auth.uid())
      WITH CHECK (instructor_id = auth.uid());
  END IF;
END $$;

-- Add module management policies for instructors
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy 
    WHERE polname = 'Instructors can manage their class modules'
  ) THEN
    CREATE POLICY "Instructors can manage their class modules"
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
END $$;

-- Add resource management policies for instructors
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy 
    WHERE polname = 'Instructors can manage module resources'
  ) THEN
    CREATE POLICY "Instructors can manage module resources"
      ON resources
      FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM modules
          JOIN classes ON classes.id = modules.class_id
          WHERE modules.id = resources.module_id
          AND classes.instructor_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM modules
          JOIN classes ON classes.id = modules.class_id
          WHERE modules.id = resources.module_id
          AND classes.instructor_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Create enrollments table for tracking student access
CREATE TABLE IF NOT EXISTS enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  class_id uuid REFERENCES classes(id) ON DELETE CASCADE,
  enrolled_at timestamptz DEFAULT now(),
  status text DEFAULT 'active' CHECK (status IN ('active', 'completed', 'dropped')),
  UNIQUE(user_id, class_id)
);

-- Enable RLS on enrollments
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;

-- Create indexes for enrollments
CREATE INDEX IF NOT EXISTS idx_enrollments_user ON enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_class ON enrollments(class_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_status ON enrollments(status);

-- Add enrollment policies
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy 
    WHERE polname = 'Users can view their own enrollments'
  ) THEN
    CREATE POLICY "Users can view their own enrollments"
      ON enrollments
      FOR SELECT
      TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy 
    WHERE polname = 'Instructors can view class enrollments'
  ) THEN
    CREATE POLICY "Instructors can view class enrollments"
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
END $$;

-- Update class policies to check enrollment
CREATE POLICY "Students can access enrolled classes"
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
    OR instructor_id = auth.uid()
  );

-- Update module policies to check enrollment
CREATE POLICY "Students can access enrolled class modules"
  ON modules
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM enrollments
      JOIN classes ON classes.id = enrollments.class_id
      WHERE classes.id = modules.class_id
      AND enrollments.user_id = auth.uid()
      AND enrollments.status = 'active'
    )
    OR EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = modules.class_id
      AND classes.instructor_id = auth.uid()
    )
  );

-- Update resource policies to check enrollment
CREATE POLICY "Students can access enrolled class resources"
  ON resources
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM enrollments
      JOIN classes ON classes.id = enrollments.class_id
      JOIN modules ON modules.class_id = classes.id
      WHERE modules.id = resources.module_id
      AND enrollments.user_id = auth.uid()
      AND enrollments.status = 'active'
    )
    OR EXISTS (
      SELECT 1 FROM modules
      JOIN classes ON classes.id = modules.class_id
      WHERE modules.id = resources.module_id
      AND classes.instructor_id = auth.uid()
    )
  );