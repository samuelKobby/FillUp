-- Drop the trigger first
DROP TRIGGER IF EXISTS agent_location_update_trigger ON agents;

-- Drop the complex geography column and use simple coordinates
ALTER TABLE agents DROP COLUMN IF EXISTS current_location;
ALTER TABLE agents DROP COLUMN IF EXISTS last_location_update;

-- Add simple latitude and longitude columns
ALTER TABLE agents ADD COLUMN IF NOT EXISTS current_latitude double precision;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS current_longitude double precision;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS last_location_update timestamptz;

-- Create simple function to update location
CREATE OR REPLACE FUNCTION update_agent_location(
  agent_id uuid,
  lat double precision,
  lng double precision
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE agents
  SET 
    current_latitude = lat,
    current_longitude = lng,
    last_location_update = NOW()
  WHERE id = agent_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION update_agent_location TO authenticated;

-- Add comments
COMMENT ON COLUMN agents.current_latitude IS 'Current GPS latitude of the agent';
COMMENT ON COLUMN agents.current_longitude IS 'Current GPS longitude of the agent';
COMMENT ON COLUMN agents.last_location_update IS 'Timestamp of last location update';
