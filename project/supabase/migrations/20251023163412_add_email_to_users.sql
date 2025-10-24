/*
  # Add Email Column to Users Table

  1. Changes
    - Add `email` column (text, optional)
    - This allows users to have an email address associated with their account

  2. Notes
    - Using IF NOT EXISTS to prevent errors if column already exists
    - Email is optional and defaults to empty string
*/

-- Add email column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'email'
  ) THEN
    ALTER TABLE users ADD COLUMN email text DEFAULT '';
  END IF;
END $$;
