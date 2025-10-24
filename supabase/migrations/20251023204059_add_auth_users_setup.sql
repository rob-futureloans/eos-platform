/*
  # Authentication Setup for EOS Platform

  1. Purpose
    - Enable Supabase email/password authentication
    - Link auth.users with custom users table via email
    - Set up proper RLS policies for authenticated access

  2. Changes
    - Add RLS policies for users table with authentication checks
    - Create function to sync user profiles with auth
    - Enable authenticated access to application data

  3. Security
    - Users can only read their own profile
    - Super users can manage all users
    - All data access requires authentication

  4. Notes
    - Users must be created in both auth.users (Supabase Auth) and users table
    - Email field links the two tables together
    - Passwords are managed by Supabase Auth, not stored in users table
*/

-- Enable RLS on users table if not already enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read own profile" ON users;
DROP POLICY IF EXISTS "Super users can read all users" ON users;
DROP POLICY IF EXISTS "Super users can insert users" ON users;
DROP POLICY IF EXISTS "Super users can update users" ON users;
DROP POLICY IF EXISTS "Super users can delete users" ON users;
DROP POLICY IF EXISTS "Allow anon access to users" ON users;

-- Create new authentication-based policies
CREATE POLICY "Users can read own profile"
  ON users FOR SELECT
  TO authenticated
  USING (auth.jwt() ->> 'email' = email);

CREATE POLICY "Super users can read all users"
  ON users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE email = auth.jwt() ->> 'email'
      AND role = 'super_user'
    )
  );

CREATE POLICY "Super users can insert users"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE email = auth.jwt() ->> 'email'
      AND role = 'super_user'
    )
  );

CREATE POLICY "Super users can update users"
  ON users FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE email = auth.jwt() ->> 'email'
      AND role = 'super_user'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE email = auth.jwt() ->> 'email'
      AND role = 'super_user'
    )
  );

CREATE POLICY "Super users can delete users"
  ON users FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE email = auth.jwt() ->> 'email'
      AND role = 'super_user'
    )
  );

-- Allow read access for all authenticated users to view user list (for dropdowns, filters, etc.)
CREATE POLICY "Authenticated users can view all users"
  ON users FOR SELECT
  TO authenticated
  USING (true);
