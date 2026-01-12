-- Add current_location column to agents table for real-time GPS tracking
ALTER TABLE agents
ADD COLUMN IF NOT EXISTS current_location geography(Point, 4326);

-- Add index for faster location queries
CREATE INDEX IF NOT EXISTS idx_agents_current_location 
ON agents USING GIST (current_location);

-- Add last_location_update timestamp
ALTER TABLE agents
ADD COLUMN IF NOT EXISTS last_location_update timestamptz;

-- Create function to update location timestamp automatically
CREATE OR REPLACE FUNCTION update_agent_location_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_location_update = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update timestamp on location change
DROP TRIGGER IF EXISTS agent_location_update_trigger ON agents;
CREATE TRIGGER agent_location_update_trigger
  BEFORE UPDATE OF current_location ON agents
  FOR EACH ROW
  EXECUTE FUNCTION update_agent_location_timestamp();

-- Enable Row Level Security policies for location updates
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Agents can update own location" ON agents;
DROP POLICY IF EXISTS "Customers can view agent location for active orders" ON agents;

-- Policy: Agents can update their own location
CREATE POLICY "Agents can update own location"
ON agents
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Note: Removed SELECT policy to prevent circular recursion with orders table.
-- Customers access agent data through orders table joins, which are secured by orders policies.
-- This prevents: orders policies -> check agents -> agents policies -> check orders -> infinite loop

-- Comment the columns
COMMENT ON COLUMN agents.current_location IS 'Real-time GPS location of the agent (PostGIS Point with latitude/longitude)';
COMMENT ON COLUMN agents.last_location_update IS 'Timestamp of the last location update';
