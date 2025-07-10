/*
  # Add module progress tracking

  1. New Tables
    - `module_progress`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `module_id` (uuid, references modules)
      - `completed` (boolean)
      - `last_accessed` (timestamp)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on module_progress table
    - Add policies for users to manage their own progress
    - Add policy for instructors to view progress of their students

  3. Indexes
    - Index on user_id and module_id for faster lookups
    - Index on completed status for filtering
*/

-- Create module_progress table
CREATE TABLE IF NOT EXISTS module_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  module_id uuid REFERENCES modules(id) ON DELETE CASCADE,
  completed boolean DEFAULT false,
  last_accessed timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, module_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_module_progress_user ON module_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_module_progress_module ON module_progress(module_id);
CREATE INDEX IF NOT EXISTS idx_module_progress_completed ON module_progress(completed);

-- Create updated_at trigger
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_module_progress_updated_at'
  ) THEN
    CREATE TRIGGER update_module_progress_updated_at
      BEFORE UPDATE ON module_progress
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Enable RLS
ALTER TABLE module_progress ENABLE ROW LEVEL SECURITY;

-- Create policies
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy 
    WHERE polname = 'Users can manage their own progress'
  ) THEN
    CREATE POLICY "Users can manage their own progress"
      ON module_progress
      FOR ALL
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy 
    WHERE polname = 'Instructors can view student progress'
  ) THEN
    CREATE POLICY "Instructors can view student progress"
      ON module_progress
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM classes c
          JOIN modules m ON m.class_id = c.id
          WHERE m.id = module_progress.module_id
          AND c.instructor_id = auth.uid()
        )
      );
  END IF;
END $$;