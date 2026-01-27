-- Fix agent columns to have proper defaults and NULL constraints
-- This ensures new agent registrations work correctly

-- Set defaults for existing NULL values
UPDATE agents 
SET specialties = '[]'::jsonb 
WHERE specialties IS NULL;

UPDATE agents 
SET active_order_count = 0 
WHERE active_order_count IS NULL;

UPDATE agents 
SET max_active_orders = 3 
WHERE max_active_orders IS NULL;

-- Add NOT NULL constraints to columns that should never be NULL
ALTER TABLE agents 
  ALTER COLUMN specialties SET DEFAULT '[]'::jsonb,
  ALTER COLUMN specialties SET NOT NULL;

ALTER TABLE agents 
  ALTER COLUMN active_order_count SET DEFAULT 0,
  ALTER COLUMN active_order_count SET NOT NULL;

ALTER TABLE agents 
  ALTER COLUMN max_active_orders SET DEFAULT 3,
  ALTER COLUMN max_active_orders SET NOT NULL;

-- Ensure location columns can be NULL (will be set when mechanic goes online)
ALTER TABLE agents 
  ALTER COLUMN current_location DROP NOT NULL;

ALTER TABLE agents 
  ALTER COLUMN last_location_update DROP NOT NULL;
