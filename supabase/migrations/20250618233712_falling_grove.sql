/*
  # Create ratings table for service quality feedback

  1. New Tables
    - `ratings`
      - `id` (uuid, primary key)
      - `order_id` (uuid, foreign key to orders)
      - `reviewer_id` (uuid, foreign key to users)
      - `reviewee_id` (uuid, foreign key to users)
      - `rating` (integer, 1-5)
      - `comment` (text, nullable)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `ratings` table
    - Add policies for users to create ratings for their orders
    - Add policies for users to view ratings about them
*/

-- Create ratings table
CREATE TABLE IF NOT EXISTS ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reviewee_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(order_id, reviewer_id, reviewee_id)
);

-- Enable RLS
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can create ratings for their orders"
  ON ratings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    reviewer_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM orders
      WHERE id = order_id AND 
      (customer_id = auth.uid() OR 
       agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid()))
    )
  );

CREATE POLICY "Users can view ratings about them"
  ON ratings
  FOR SELECT
  TO authenticated
  USING (reviewee_id = auth.uid() OR reviewer_id = auth.uid());

CREATE POLICY "Admins can manage all ratings"
  ON ratings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );