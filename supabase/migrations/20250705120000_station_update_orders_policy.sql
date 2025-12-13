/*
  # Add RLS policy for stations to update orders

  1. New Policy
    - Allow stations to update orders that belong to them
    - This enables the station dashboard to accept orders

  2. Security
    - Only allows stations to update orders assigned to their station
    - Maintains security while enabling the order acceptance workflow
*/

-- Add policy for stations to update their own orders
CREATE POLICY "Stations can update own orders"
  ON orders
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM stations s
      JOIN users u ON s.user_id = u.id
      WHERE u.id = auth.uid() AND s.id = orders.station_id
    )
  );

-- Also add a policy for stations to update orders that are pending and assigned to them
CREATE POLICY "Stations can accept pending orders"
  ON orders
  FOR UPDATE
  TO authenticated
  USING (
    status = 'pending' AND
    EXISTS (
      SELECT 1 FROM stations s
      JOIN users u ON s.user_id = u.id
      WHERE u.id = auth.uid() AND s.id = orders.station_id
    )
  );
