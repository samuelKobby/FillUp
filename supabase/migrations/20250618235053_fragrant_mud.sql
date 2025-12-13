/*
  # Add INSERT policy for user registration

  1. Security Changes
    - Add INSERT policy for users table to allow authenticated users to create their own profile
    - Policy ensures users can only insert their own data (auth.uid() = id)

  This fixes the registration error where new users couldn't create their profile due to missing INSERT permissions.
*/

-- Add INSERT policy for user registration
CREATE POLICY "Users can insert own data during registration"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);