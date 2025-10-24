/*
  # Add User Roles and Session Tracking

  1. Changes
    - Add `role` column to users table (super_user or user)
    - Add `active_session` table to track logged in user
    - Set Rob Maloney as super_user
    - Set all other users as regular users

  2. Security
    - Maintain existing RLS policies
*/

-- Add role column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'user';

-- Create table to track active logged in user (single row table)
CREATE TABLE IF NOT EXISTS active_session (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE active_session ENABLE ROW LEVEL SECURITY;

-- Create policy for active_session
CREATE POLICY "Allow all operations on active_session"
  ON active_session FOR ALL
  USING (true)
  WITH CHECK (true);

-- Update Rob Maloney to be super_user
UPDATE users SET role = 'super_user' WHERE name = 'Rob Maloney';

-- Ensure all other users are set to 'user' role
UPDATE users SET role = 'user' WHERE name != 'Rob Maloney';

-- Create trigger for active_session updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_active_session_updated_at'
  ) THEN
    CREATE TRIGGER update_active_session_updated_at
      BEFORE UPDATE ON active_session
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Insert Rob Maloney as the default active user (single row)
DO $$
DECLARE
  rob_id uuid;
BEGIN
  SELECT id INTO rob_id FROM users WHERE name = 'Rob Maloney' LIMIT 1;
  
  IF rob_id IS NOT NULL THEN
    DELETE FROM active_session;
    INSERT INTO active_session (user_id) VALUES (rob_id);
  END IF;
END $$;