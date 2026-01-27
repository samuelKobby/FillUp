-- =====================================================
-- MECHANIC AUTO-ASSIGNMENT SYSTEM
-- =====================================================
-- This migration implements automatic mechanic assignment
-- for mechanic service orders based on proximity and availability

-- Step 1: Add 'pending_acceptance' to order_status enum if it doesn't exist
-- Using IF NOT EXISTS (PostgreSQL 13+) to avoid errors if already exists
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'pending_acceptance';

-- Step 2: Add mechanic-specific fields to agents table if they don't exist
DO $$ 
BEGIN
  -- Add fields for tracking mechanic specialties and current status
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='agents' AND column_name='specialties') THEN
    ALTER TABLE agents ADD COLUMN specialties jsonb DEFAULT '[]'::jsonb NOT NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='agents' AND column_name='active_order_count') THEN
    ALTER TABLE agents ADD COLUMN active_order_count integer DEFAULT 0 NOT NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='agents' AND column_name='max_active_orders') THEN
    ALTER TABLE agents ADD COLUMN max_active_orders integer DEFAULT 3 NOT NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='agents' AND column_name='last_location_update') THEN
    ALTER TABLE agents ADD COLUMN last_location_update timestamp with time zone NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='agents' AND column_name='current_location') THEN
    ALTER TABLE agents ADD COLUMN current_location point NULL;
  END IF;

  -- Add field to track assignment attempts for reassignment logic
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='orders' AND column_name='assignment_attempts') THEN
    ALTER TABLE orders ADD COLUMN assignment_attempts integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='orders' AND column_name='assigned_at') THEN
    ALTER TABLE orders ADD COLUMN assigned_at timestamp with time zone;
  END IF;
END $$;

-- Step 3: Create function to calculate distance between two points (in kilometers)
CREATE OR REPLACE FUNCTION calculate_distance(
  point1 point,
  point2 point
) RETURNS numeric AS $$
DECLARE
  lat1 numeric;
  lon1 numeric;
  lat2 numeric;
  lon2 numeric;
  radius numeric := 6371; -- Earth's radius in kilometers
  dlat numeric;
  dlon numeric;
  a numeric;
  c numeric;
BEGIN
  -- Extract coordinates
  lat1 := point1[1];
  lon1 := point1[0];
  lat2 := point2[1];
  lon2 := point2[0];
  
  -- Haversine formula
  dlat := radians(lat2 - lat1);
  dlon := radians(lon2 - lon1);
  
  a := sin(dlat/2) * sin(dlat/2) + 
       cos(radians(lat1)) * cos(radians(lat2)) * 
       sin(dlon/2) * sin(dlon/2);
  
  c := 2 * atan2(sqrt(a), sqrt(1-a));
  
  RETURN radius * c;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Step 4: Create function to find nearest available mechanic
CREATE OR REPLACE FUNCTION find_nearest_mechanic(
  order_location point,
  required_service text DEFAULT NULL,
  max_distance numeric DEFAULT 50 -- Maximum distance in kilometers
) RETURNS uuid AS $$
DECLARE
  nearest_mechanic_id uuid;
BEGIN
  -- Find the nearest available mechanic who:
  -- 1. Has mechanic service type
  -- 2. Is verified and available
  -- 3. Has capacity for more orders
  -- 4. Is within max_distance
  -- 5. Optionally has the required specialty
  SELECT a.id INTO nearest_mechanic_id
  FROM agents a
  WHERE 
    a.service_type IN ('mechanic', 'both')
    AND a.is_verified = true
    AND a.is_available = true
    AND (a.active_order_count < a.max_active_orders)
    AND a.current_location IS NOT NULL
    AND calculate_distance(a.current_location, order_location) <= max_distance
    AND (
      required_service IS NULL 
      OR a.specialties @> to_jsonb(ARRAY[required_service])
      OR jsonb_array_length(a.specialties) = 0 -- Accept mechanics with no specialties
    )
  ORDER BY 
    calculate_distance(a.current_location, order_location) ASC,
    a.rating DESC,
    a.total_jobs DESC
  LIMIT 1;
  
  RETURN nearest_mechanic_id;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create function to auto-assign mechanic to order
CREATE OR REPLACE FUNCTION auto_assign_mechanic_to_order()
RETURNS trigger AS $$
DECLARE
  assigned_mechanic_id uuid;
  order_point point;
BEGIN
  -- Only auto-assign for new mechanic orders that don't have an agent assigned
  IF NEW.service_type = 'mechanic' AND NEW.agent_id IS NULL AND NEW.status = 'pending' THEN
    
    -- Convert delivery_location to point if it exists
    IF NEW.delivery_location IS NOT NULL THEN
      order_point := NEW.delivery_location;
    ELSE
      -- Default to a location if not provided (should not happen in production)
      order_point := point(0, 0);
    END IF;
    
    -- Find nearest available mechanic
    assigned_mechanic_id := find_nearest_mechanic(
      order_point,
      NEW.mechanic_service,
      50 -- 50km max distance
    );
    
    -- If a mechanic was found, assign them (but require acceptance)
    IF assigned_mechanic_id IS NOT NULL THEN
      NEW.agent_id := assigned_mechanic_id;
      NEW.status := 'pending_acceptance'; -- Mechanic must accept within timeout
      NEW.assigned_at := now();
      NEW.assignment_attempts := COALESCE(NEW.assignment_attempts, 0) + 1;
      
      -- Note: We do NOT increment active_order_count yet
      -- It will be incremented only when mechanic accepts
      
      -- Log the assignment
      RAISE NOTICE 'Auto-assigned mechanic % to order % (pending acceptance)', assigned_mechanic_id, NEW.id;
    ELSE
      -- No mechanic found, keep status as pending
      NEW.status := 'pending';
      RAISE NOTICE 'No available mechanic found for order %', NEW.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Create trigger for auto-assignment
DROP TRIGGER IF EXISTS trigger_auto_assign_mechanic ON orders;
CREATE TRIGGER trigger_auto_assign_mechanic
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_mechanic_to_order();

-- Step 7: Create function to update active order count when order status changes
CREATE OR REPLACE FUNCTION update_agent_order_count()
RETURNS trigger AS $$
BEGIN
  -- When mechanic accepts order (pending_acceptance -> accepted)
  IF (NEW.status = 'accepted') AND 
     (OLD.status = 'pending_acceptance') AND 
     NEW.agent_id IS NOT NULL THEN
    
    -- Increment active order count
    UPDATE agents 
    SET active_order_count = active_order_count + 1,
        updated_at = now()
    WHERE id = NEW.agent_id;
    
    -- Set accepted_at timestamp
    NEW.accepted_at := now();
    
  -- When order is completed or cancelled, decrement count
  ELSIF (NEW.status IN ('completed', 'cancelled')) AND 
        (OLD.status NOT IN ('completed', 'cancelled')) AND 
        NEW.agent_id IS NOT NULL THEN
    
    UPDATE agents 
    SET active_order_count = GREATEST(0, active_order_count - 1),
        updated_at = now()
    WHERE id = NEW.agent_id;
    
  -- When order transitions to in_progress from accepted
  ELSIF (NEW.status = 'in_progress') AND 
        (OLD.status = 'accepted') AND 
        NEW.agent_id IS NOT NULL THEN
    
    -- No count change needed, already counted when accepted
    NULL;
    
  -- When order is reassigned (mechanic declined or timeout)
  ELSIF (NEW.agent_id IS NOT NULL) AND 
        (OLD.agent_id IS NOT NULL) AND 
        (NEW.agent_id != OLD.agent_id) AND
        NEW.status = 'pending_acceptance' THEN
    
    -- Decrement for old mechanic (if they had accepted)
    IF OLD.status = 'accepted' OR OLD.status = 'in_progress' THEN
      UPDATE agents 
      SET active_order_count = GREATEST(0, active_order_count - 1),
          updated_at = now()
      WHERE id = OLD.agent_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 8: Create trigger for order count updates
DROP TRIGGER IF EXISTS trigger_update_agent_order_count ON orders;
CREATE TRIGGER trigger_update_agent_order_count
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_agent_order_count();

-- Step 9: Create function for mechanic to decline order
CREATE OR REPLACE FUNCTION decline_mechanic_order(
  order_id uuid,
  mechanic_id uuid
) RETURNS boolean AS $$
DECLARE
  order_record RECORD;
  next_mechanic_id uuid;
BEGIN
  -- Get the order details
  SELECT * INTO order_record
  FROM orders
  WHERE id = order_id AND agent_id = mechanic_id;
  
  IF NOT FOUND THEN
    RAISE NOTICE 'Order % not found or not assigned to mechanic %', order_id, mechanic_id;
    RETURN false;
  END IF;
  
  -- Check if max assignment attempts reached
  IF order_record.assignment_attempts >= 3 THEN
    -- Move to general pool after 3 failed assignments
    UPDATE orders
    SET agent_id = NULL,
        status = 'pending',
        assigned_at = NULL
    WHERE id = order_id;
    
    RAISE NOTICE 'Order % moved to general pool after 3 failed assignments', order_id;
    RETURN true;
  END IF;
  
  -- Find next nearest mechanic (excluding the one who declined)
  SELECT a.id INTO next_mechanic_id
  FROM agents a
  WHERE 
    a.id != mechanic_id
    AND a.service_type IN ('mechanic', 'both')
    AND a.is_verified = true
    AND a.is_available = true
    AND (a.active_order_count < a.max_active_orders)
    AND a.current_location IS NOT NULL
    AND calculate_distance(a.current_location, order_record.delivery_location) <= 50
    AND (
      order_record.mechanic_service IS NULL 
      OR a.specialties @> to_jsonb(ARRAY[order_record.mechanic_service])
      OR jsonb_array_length(a.specialties) = 0
    )
  ORDER BY 
    calculate_distance(a.current_location, order_record.delivery_location) ASC,
    a.rating DESC
  LIMIT 1;
  
  IF next_mechanic_id IS NOT NULL THEN
    -- Reassign to next mechanic
    UPDATE orders
    SET agent_id = next_mechanic_id,
        status = 'pending_acceptance',
        assigned_at = now(),
        assignment_attempts = order_record.assignment_attempts + 1
    WHERE id = order_id;
    
    RAISE NOTICE 'Order % reassigned to mechanic %', order_id, next_mechanic_id;
  ELSE
    -- No other mechanics available, move to general pool
    UPDATE orders
    SET agent_id = NULL,
        status = 'pending',
        assigned_at = NULL
    WHERE id = order_id;
    
    RAISE NOTICE 'No mechanics available for order %, moved to general pool', order_id;
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 10: Create function to handle timeout (orders pending acceptance > 2 minutes)
CREATE OR REPLACE FUNCTION handle_mechanic_acceptance_timeout()
RETURNS integer AS $$
DECLARE
  timed_out_order RECORD;
  reassigned_count integer := 0;
BEGIN
  -- Find orders pending acceptance for more than 2 minutes
  FOR timed_out_order IN
    SELECT id, agent_id, delivery_location, mechanic_service, assignment_attempts
    FROM orders
    WHERE status = 'pending_acceptance'
      AND service_type = 'mechanic'
      AND assigned_at < (now() - interval '2 minutes')
  LOOP
    -- Call decline function to handle reassignment
    PERFORM decline_mechanic_order(timed_out_order.id, timed_out_order.agent_id);
    reassigned_count := reassigned_count + 1;
  END LOOP;
  
  RETURN reassigned_count;
END;
$$ LANGUAGE plpgsql;

-- Step 11: Initialize active order counts for existing agents
-- Only count ACCEPTED and IN_PROGRESS orders (not pending_acceptance)
UPDATE agents
SET active_order_count = (
  SELECT COUNT(*)
  FROM orders
  WHERE orders.agent_id = agents.id
    AND orders.status IN ('accepted', 'in_progress')
    AND orders.service_type = 'mechanic'
)
WHERE service_type IN ('mechanic', 'both');

-- Step 12: Add comments for documentation
COMMENT ON FUNCTION calculate_distance IS 
'Calculates the distance in kilometers between two geographic points using the Haversine formula';

COMMENT ON FUNCTION find_nearest_mechanic IS 
'Finds the nearest available mechanic for an order based on location, service requirements, and availability';

COMMENT ON FUNCTION auto_assign_mechanic_to_order IS 
'Automatically assigns the nearest available mechanic to new mechanic service orders in pending_acceptance status';

COMMENT ON FUNCTION update_agent_order_count IS 
'Maintains accurate count of active orders for each agent. Only counts orders after mechanic acceptance.';

COMMENT ON FUNCTION decline_mechanic_order IS 
'Allows a mechanic to decline an order. Reassigns to next nearest mechanic or moves to general pool after 3 attempts.';

COMMENT ON FUNCTION handle_mechanic_acceptance_timeout IS 
'Processes orders that have been pending acceptance for more than 2 minutes. Automatically reassigns them.';

-- Step 13: Create indexes for faster location-based queries
CREATE INDEX IF NOT EXISTS idx_agents_location_gist 
ON agents USING gist(current_location);

CREATE INDEX IF NOT EXISTS idx_agents_service_availability 
ON agents(service_type, is_available, is_verified);

CREATE INDEX IF NOT EXISTS idx_orders_mechanic_pending 
ON orders(service_type, status, created_at) 
WHERE service_type = 'mechanic';

CREATE INDEX IF NOT EXISTS idx_orders_pending_acceptance_timeout
ON orders(status, assigned_at, service_type)
WHERE service_type = 'mechanic';

-- Step 14: Create cron job to handle timeouts every minute (requires pg_cron extension)
-- Note: This requires pg_cron extension to be enabled in Supabase
-- You can also call this function via a Supabase Edge Function scheduled with cron
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule timeout check every minute
SELECT cron.schedule(
  'handle-mechanic-timeouts',
  '* * * * *', -- Every minute
  $$SELECT handle_mechanic_acceptance_timeout()$$
);
