/*
  # Add First and Last Name to Users Table

  1. Changes
    - Add `first_name` column (text, required)
    - Add `last_name` column (text, required)
    - Keep `name` column for backward compatibility (will be computed as first_name + last_name)
    - Update existing users to split their names into first/last

  2. Data Migration
    - Split existing names into first and last names
    - Default single-word names to first name with empty last name

  3. Notes
    - Using IF NOT EXISTS to prevent errors if columns already exist
    - Maintains backward compatibility with existing `name` column
*/

-- Add first_name column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'first_name'
  ) THEN
    ALTER TABLE users ADD COLUMN first_name text DEFAULT '';
  END IF;
END $$;

-- Add last_name column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'last_name'
  ) THEN
    ALTER TABLE users ADD COLUMN last_name text DEFAULT '';
  END IF;
END $$;

-- Update existing users to split their names
UPDATE users
SET 
  first_name = CASE 
    WHEN position(' ' in name) > 0 THEN split_part(name, ' ', 1)
    ELSE name
  END,
  last_name = CASE 
    WHEN position(' ' in name) > 0 THEN substring(name from position(' ' in name) + 1)
    ELSE ''
  END
WHERE first_name = '' OR first_name IS NULL;

-- Make first_name required (not null)
ALTER TABLE users ALTER COLUMN first_name SET NOT NULL;
ALTER TABLE users ALTER COLUMN last_name SET NOT NULL;