/*
  # Fix user registration RLS policy

  1. Security Updates
    - Update the INSERT policy for users table to properly handle registration
    - Ensure new users can create their profile during the registration process

  The issue is that the current policy check `(uid() = id)` may not work properly
  during the registration flow. We need to ensure the policy allows insertion
  when the user ID matches the authenticated user's ID.
*/

-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Users can insert own data during registration" ON users;

-- Create a new INSERT policy that properly handles registration
CREATE POLICY "Users can insert own data during registration"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Also ensure we have a proper SELECT policy for users to read their own data
DROP POLICY IF EXISTS "Users can read own data" ON users;

CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Ensure we have an UPDATE policy for users to update their own data
DROP POLICY IF EXISTS "Users can update own data" ON users;

CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);