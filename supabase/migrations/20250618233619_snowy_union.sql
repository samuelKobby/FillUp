/*
  # Create agents table for service providers

  1. New Tables
    - `agents`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `service_type` (enum: fuel_delivery, mechanic, both)
      - `vehicle_info` (jsonb for vehicle details)
      - `license_number` (text)
      - `is_verified` (boolean)
      - `is_available` (boolean)
      - `current_location` (point, PostGIS)
      - `rating` (decimal)
      - `total_jobs` (integer)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `agents` table
    - Add policies for agents to manage their own data
    - Add policies for customers to view verified agents
*/

-- Create enum for service types
CREATE TYPE service_type AS ENUM ('fuel_delivery', 'mechanic', 'both');

-- Create agents table
CREATE TABLE IF NOT EXISTS agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  service_type service_type NOT NULL DEFAULT 'fuel_delivery',
  vehicle_info jsonb,
  license_number text,
  is_verified boolean DEFAULT false,
  is_available boolean DEFAULT true,
  current_location point,
  rating decimal(3,2) DEFAULT 5.0,
  total_jobs integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Agents can manage own data"
  ON agents
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Customers can view verified agents"
  ON agents
  FOR SELECT
  TO authenticated
  USING (
    is_verified = true AND
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role IN ('customer', 'admin')
    )
  );

CREATE POLICY "Admins can manage all agents"
  ON agents
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create trigger for updated_at
CREATE TRIGGER update_agents_updated_at
  BEFORE UPDATE ON agents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();