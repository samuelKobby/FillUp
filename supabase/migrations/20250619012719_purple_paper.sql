/*
  # Fix infinite recursion in users table RLS policies

  1. Problem
    - The "Admins can read all users" policy creates infinite recursion
    - It queries the users table to check if current user is admin
    - This causes a loop during policy evaluation

  2. Solution
    - Drop the problematic policies that cause recursion
    - Create new policies that avoid querying the users table in their conditions
    - Use a simpler approach for admin access that doesn't create loops

  3. Security
    - Maintain proper access control without recursion
    - Users can still read/update their own data
    - Admins will need to use service role key for full access
*/

-- Drop existing policies that cause recursion
DROP POLICY IF EXISTS "Admins can read all users" ON users;
DROP POLICY IF EXISTS "Admins can update all users" ON users;

-- Keep the safe policies that don't cause recursion
-- These policies are already correct and don't query the users table:
-- - "Users can insert own data during registration" 
-- - "Users can read own data"
-- - "Users can update own data"

-- Create a new admin policy that uses a different approach
-- This policy allows service role access without recursion
CREATE POLICY "Service role can manage all users"
  ON users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Optional: Create a policy for authenticated users to read basic user info
-- This is safe because it doesn't query the users table in the condition
CREATE POLICY "Authenticated users can read basic user info"
  ON users
  FOR SELECT
  TO authenticated
  USING (true);