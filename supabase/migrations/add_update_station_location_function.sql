-- Create function to update station location with proper PostGIS handling
CREATE OR REPLACE FUNCTION update_station_location(
  station_id uuid,
  lat double precision,
  lng double precision
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE stations
  SET 
    location = point(lng, lat),
    updated_at = NOW()
  WHERE id = station_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_station_location TO authenticated;
