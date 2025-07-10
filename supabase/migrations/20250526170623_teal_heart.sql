/*
  # Learning Platform Schema Setup
  
  1. Tables
    - classes (course information and instructor details)
    - modules (course content organized by sections)
    - resources (additional materials for modules)
    - notes (user-specific notes for modules)
  
  2. Security
    - RLS enabled on all tables
    - Policies for authenticated access
    - Secure note management
    
  3. Features
    - Automatic timestamp updates
    - Cascading deletes for related content
    - Efficient indexing
*/

-- Create updated_at function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Classes table
CREATE TABLE IF NOT EXISTS classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  instructor_id uuid REFERENCES auth.users(id),
  thumbnail_url text NOT NULL,
  instructor_image text,
  instructor_bio text,
  schedule_data jsonb DEFAULT '{}'::jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_classes_updated_at'
  ) THEN
    CREATE TRIGGER update_classes_updated_at
      BEFORE UPDATE ON classes
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

ALTER TABLE classes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy 
    WHERE polname = 'Classes are viewable by authenticated users'
  ) THEN
    CREATE POLICY "Classes are viewable by authenticated users"
      ON classes
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

-- Modules table
CREATE TABLE IF NOT EXISTS modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid REFERENCES classes(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  slide_url text NOT NULL,
  "order" integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_modules_class_id ON modules(class_id);
CREATE INDEX IF NOT EXISTS idx_modules_order ON modules("order");

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_modules_updated_at'
  ) THEN
    CREATE TRIGGER update_modules_updated_at
      BEFORE UPDATE ON modules
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

ALTER TABLE modules ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy 
    WHERE polname = 'Modules are viewable by authenticated users'
  ) THEN
    CREATE POLICY "Modules are viewable by authenticated users"
      ON modules
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

-- Resources table
CREATE TABLE IF NOT EXISTS resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid REFERENCES modules(id) ON DELETE CASCADE,
  title text NOT NULL,
  type text NOT NULL CHECK (type IN ('pdf', 'link')),
  url text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_resources_module_id ON resources(module_id);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_resources_updated_at'
  ) THEN
    CREATE TRIGGER update_resources_updated_at
      BEFORE UPDATE ON resources
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

ALTER TABLE resources ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy 
    WHERE polname = 'Resources are viewable by authenticated users'
  ) THEN
    CREATE POLICY "Resources are viewable by authenticated users"
      ON resources
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

-- Notes table
CREATE TABLE IF NOT EXISTS notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  module_id uuid REFERENCES modules(id) ON DELETE CASCADE,
  content text NOT NULL,
  last_updated timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notes_user_module ON notes(user_id, module_id);

ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy 
    WHERE polname = 'Users can manage their own notes'
  ) THEN
    CREATE POLICY "Users can manage their own notes"
      ON notes
      FOR ALL
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;