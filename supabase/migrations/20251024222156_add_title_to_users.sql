/*
  # Add Title Column to Users Table

  1. Changes
    - Add `title` column (text, optional)
    - This allows users to have a job title (e.g., "CEO", "COO", "Developer")

  2. Notes
    - Using IF NOT EXISTS to prevent errors if column already exists
    - Title is optional and defaults to empty string
*/

-- Add title column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'title'
  ) THEN
    ALTER TABLE users ADD COLUMN title text DEFAULT '';
  END IF;
END $$;