/*
  # Allow First User Creation Without Authentication
  
  1. Changes
    - Add a policy to allow INSERT on users table when table is empty (first user)
    - This enables the setup flow to create the initial super user
  
  2. Security
    - Policy only allows insert when users table is completely empty
    - Once any user exists, normal RLS policies take over
*/

-- Drop the policy if it exists
DROP POLICY IF EXISTS "Allow first user creation" ON users;

-- Allow inserting the first user when table is empty
CREATE POLICY "Allow first user creation"
  ON users
  FOR INSERT
  TO anon
  WITH CHECK (
    NOT EXISTS (SELECT 1 FROM users LIMIT 1)
  );
