/*
  # Create transactions table for financial records

  1. New Tables
    - `transactions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `order_id` (uuid, foreign key to orders, nullable)
      - `type` (enum: payment, earning, withdrawal, refund, fee)
      - `amount` (decimal)
      - `description` (text)
      - `payment_method` (text)
      - `reference` (text, unique)
      - `status` (enum: pending, completed, failed)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `transactions` table
    - Add policies for users to view their own transactions
    - Add policies for admins to manage all transactions
*/

-- Create enum for transaction types
CREATE TYPE transaction_type AS ENUM ('payment', 'earning', 'withdrawal', 'refund', 'fee');

-- Create enum for transaction status
CREATE TYPE transaction_status AS ENUM ('pending', 'completed', 'failed');

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  type transaction_type NOT NULL,
  amount decimal(10,2) NOT NULL,
  description text,
  payment_method text,
  reference text UNIQUE,
  status transaction_status DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own transactions"
  ON transactions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all transactions"
  ON transactions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );