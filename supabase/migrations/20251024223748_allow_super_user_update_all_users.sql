/*
  # Allow Super Users to Update All Users

  1. Changes
    - Add policy to allow users with 'super_user' role to update any user record
    - This enables admin functionality in the Admin page

  2. Security
    - Policy checks if the authenticated user has role = 'super_user' in the users table
    - Existing policy for users to update their own records remains in place
*/

-- Create policy for super users to update any user
CREATE POLICY "super_users_can_update_all_users"
  ON users FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'super_user'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'super_user'
    )
  );