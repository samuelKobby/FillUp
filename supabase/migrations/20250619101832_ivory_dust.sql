/*
  # Add RLS policy for customers to view fuel stations

  1. New Policy
    - Allow customers to view verified and active fuel stations
    - This enables the fuel delivery request page to show available stations

  2. Security
    - Only shows stations that are both verified and active
    - Customers can only read station data, not modify it
    - Maintains security while enabling functionality
*/

-- Add policy for customers to view active and verified stations
CREATE POLICY "Customers can view active stations"
  ON stations
  FOR SELECT
  TO authenticated
  USING (
    is_verified = true AND is_active = true AND
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'customer'
    )
  );