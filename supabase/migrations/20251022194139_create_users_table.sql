/*
  # Create Users Table

  1. New Tables
    - `users`
      - `id` (uuid, primary key)
      - `name` (text) - User's full name
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on users table
    - Add policies for all operations

  3. Seed Initial Users
    - Add users from existing rocks data
*/

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policy for users
CREATE POLICY "Allow all operations on users"
  ON users FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_users_name ON users(name);

-- Create trigger for updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Seed initial users from existing rocks
INSERT INTO users (name) VALUES
  ('Everyone'),
  ('Andy'),
  ('Jason'),
  ('Andrea'),
  ('Nate'),
  ('Jaime'),
  ('Tim'),
  ('Mitchel'),
  ('Rob Maloney')
ON CONFLICT (name) DO NOTHING;