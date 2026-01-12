-- Enable PostGIS extension if not already enabled
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create function to update agent location using PostGIS
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
  SET current_location = ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
  WHERE id = agent_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_agent_location TO authenticated;

COMMENT ON FUNCTION update_agent_location IS 'Updates agent GPS location using PostGIS ST_MakePoint function';
