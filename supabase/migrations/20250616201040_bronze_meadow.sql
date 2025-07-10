/*
  # Add Course Evaluations Table
  
  1. New Tables
    - `course_evaluations`
      - Stores user feedback for courses
      - Tracks ratings and responses
      - Includes marketing opt-ins
      
  2. Security
    - Enable RLS
    - Users can only view/manage their own evaluations
    - Instructors can view evaluations for their courses
*/

-- Create course_evaluations table
CREATE TABLE IF NOT EXISTS course_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES classes(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  overall_rating text NOT NULL,
  most_valuable_tip text,
  appropriate_pace text NOT NULL,
  more_confident text NOT NULL,
  plan_to_use text,
  interested_in_program boolean DEFAULT false,
  interested_in_organization boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_course_evaluations_course_id ON course_evaluations(course_id);
CREATE INDEX IF NOT EXISTS idx_course_evaluations_user_id ON course_evaluations(user_id);
CREATE INDEX IF NOT EXISTS idx_course_evaluations_rating ON course_evaluations(overall_rating);

-- Enable RLS
ALTER TABLE course_evaluations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage their own evaluations"
ON course_evaluations
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Instructors can view course evaluations"
ON course_evaluations
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM classes
    WHERE classes.id = course_evaluations.course_id
    AND classes.instructor_id = auth.uid()
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_course_evaluations_updated_at
BEFORE UPDATE ON course_evaluations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();