/*
  # Create fuel stations table

  1. New Tables
    - `stations`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users - station manager)
      - `name` (text)
      - `address` (text)
      - `location` (point, PostGIS)
      - `phone` (text)
      - `fuel_types` (text array)
      - `petrol_price` (decimal)
      - `diesel_price` (decimal)
      - `is_verified` (boolean)
      - `is_active` (boolean)
      - `operating_hours` (jsonb)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `stations` table
    - Add policies for station managers to manage their own data
    - Add policies for agents to view active stations
*/

-- Create stations table
CREATE TABLE IF NOT EXISTS stations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  address text NOT NULL,
  location point,
  phone text,
  fuel_types text[] DEFAULT ARRAY['petrol', 'diesel'],
  petrol_price decimal(10,2) DEFAULT 0.00,
  diesel_price decimal(10,2) DEFAULT 0.00,
  is_verified boolean DEFAULT false,
  is_active boolean DEFAULT true,
  operating_hours jsonb DEFAULT '{"monday": {"open": "06:00", "close": "22:00"}, "tuesday": {"open": "06:00", "close": "22:00"}, "wednesday": {"open": "06:00", "close": "22:00"}, "thursday": {"open": "06:00", "close": "22:00"}, "friday": {"open": "06:00", "close": "22:00"}, "saturday": {"open": "06:00", "close": "22:00"}, "sunday": {"open": "07:00", "close": "21:00"}}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE stations ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Station managers can manage own data"
  ON stations
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Agents can view active stations"
  ON stations
  FOR SELECT
  TO authenticated
  USING (
    is_verified = true AND is_active = true AND
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role IN ('agent', 'admin')
    )
  );

CREATE POLICY "Admins can manage all stations"
  ON stations
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create trigger for updated_at
CREATE TRIGGER update_stations_updated_at
  BEFORE UPDATE ON stations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();