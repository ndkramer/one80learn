/*
  # Add content column to modules table

  1. Changes
    - Add content column to modules table for storing module content
    - Make content nullable to support gradual content addition
    - Maintain existing RLS policies
*/

-- Add content column to modules table
ALTER TABLE modules 
ADD COLUMN IF NOT EXISTS content text;