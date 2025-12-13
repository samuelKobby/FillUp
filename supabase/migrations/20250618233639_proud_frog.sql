/*
  # Create orders table for service requests

  1. New Tables
    - `orders`
      - `id` (uuid, primary key)
      - `customer_id` (uuid, foreign key to users)
      - `agent_id` (uuid, foreign key to agents, nullable)
      - `station_id` (uuid, foreign key to stations, nullable)
      - `vehicle_id` (uuid, foreign key to vehicles, nullable)
      - `service_type` (enum: fuel_delivery, mechanic)
      - `status` (enum: pending, accepted, in_progress, completed, cancelled)
      - `fuel_type` (enum: petrol, diesel, nullable)
      - `fuel_quantity` (integer, nullable)
      - `mechanic_service` (text, nullable)
      - `pickup_location` (point)
      - `delivery_location` (point)
      - `pickup_address` (text)
      - `delivery_address` (text)
      - `total_amount` (decimal)
      - `platform_fee` (decimal)
      - `agent_fee` (decimal)
      - `notes` (text)
      - `scheduled_time` (timestamp, nullable)
      - `accepted_at` (timestamp, nullable)
      - `completed_at` (timestamp, nullable)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `orders` table
    - Add policies for customers to manage their orders
    - Add policies for agents to view and update assigned orders
    - Add policies for stations to view relevant orders
*/

-- Create enum for order status
CREATE TYPE order_status AS ENUM ('pending', 'accepted', 'in_progress', 'completed', 'cancelled');

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  agent_id uuid REFERENCES agents(id) ON DELETE SET NULL,
  station_id uuid REFERENCES stations(id) ON DELETE SET NULL,
  vehicle_id uuid REFERENCES vehicles(id) ON DELETE SET NULL,
  service_type service_type NOT NULL,
  status order_status DEFAULT 'pending',
  fuel_type fuel_type,
  fuel_quantity integer,
  mechanic_service text,
  pickup_location point,
  delivery_location point NOT NULL,
  pickup_address text,
  delivery_address text NOT NULL,
  total_amount decimal(10,2) NOT NULL DEFAULT 0.00,
  platform_fee decimal(10,2) DEFAULT 0.00,
  agent_fee decimal(10,2) DEFAULT 0.00,
  notes text,
  scheduled_time timestamptz,
  accepted_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Customers can manage own orders"
  ON orders
  FOR ALL
  TO authenticated
  USING (customer_id = auth.uid());

CREATE POLICY "Agents can view and update assigned orders"
  ON orders
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM agents a
      JOIN users u ON a.user_id = u.id
      WHERE u.id = auth.uid() AND a.id = orders.agent_id
    )
  );

CREATE POLICY "Agents can view pending orders"
  ON orders
  FOR SELECT
  TO authenticated
  USING (
    status = 'pending' AND
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'agent'
    )
  );

CREATE POLICY "Stations can view relevant orders"
  ON orders
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM stations s
      JOIN users u ON s.user_id = u.id
      WHERE u.id = auth.uid() AND s.id = orders.station_id
    )
  );

CREATE POLICY "Admins can manage all orders"
  ON orders
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create trigger for updated_at
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();