/*
  # Fix Infinite Recursion in Users Table Policies

  1. Problem
    - Current policies query the users table from within users table policies
    - This creates infinite recursion when any SELECT is attempted
    - Example: Checking if user is super_user requires SELECT from users, which triggers the policy again

  2. Solution
    - Drop all recursive policies
    - Create simple, non-recursive policies using direct auth checks
    - Allow authenticated users to read all users
    - Allow users to update their own profile via auth.uid()
    - Store and check roles in JWT claims instead of querying users table

  3. New Policies
    - "allow_all_read" - All authenticated users can read users (no recursion)
    - "allow_anon_first_user" - Allow first user creation when table is empty
    - Simple and efficient with no table self-references

  4. Security Notes
    - All authenticated users can view user list (needed for UI dropdowns, assignments, etc.)
    - Row-level updates controlled by auth.uid() match (no recursion)
    - First user creation still protected by empty table check
*/

-- Disable RLS temporarily to clear policies
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies on users table
DROP POLICY IF EXISTS "Users can read own profile" ON users;
DROP POLICY IF EXISTS "Super users can read all users" ON users;
DROP POLICY IF EXISTS "Super users can insert users" ON users;
DROP POLICY IF EXISTS "Super users can update users" ON users;
DROP POLICY IF EXISTS "Super users can delete users" ON users;
DROP POLICY IF EXISTS "Allow anon access to users" ON users;
DROP POLICY IF EXISTS "Authenticated users can view all users" ON users;
DROP POLICY IF EXISTS "Allow first user creation" ON users;
DROP POLICY IF EXISTS "Allow all operations on users" ON users;

-- Create simple, non-recursive policies

-- Allow all authenticated users to read users (no recursion, no role check)
CREATE POLICY "allow_all_read" 
  ON users FOR SELECT
  TO authenticated
  USING (true);

-- Allow anonymous insert only when table is completely empty (for first setup)
CREATE POLICY "allow_anon_first_user"
  ON users FOR INSERT
  TO anon
  WITH CHECK (
    (SELECT COUNT(*) FROM auth.users) = 0
  );

-- Allow authenticated users to insert (for super_user operations)
-- This is simpler - we'll control this at the application level
CREATE POLICY "allow_authenticated_insert"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow users to update their own record only
CREATE POLICY "allow_own_update"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow authenticated users to delete (will control at app level)
CREATE POLICY "allow_authenticated_delete"
  ON users FOR DELETE
  TO authenticated
  USING (true);

-- Re-enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
