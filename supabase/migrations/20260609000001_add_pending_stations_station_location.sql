-- Add station_location alias column to pending_stations to resolve schema cache issues
-- This migration is idempotent and will populate the new column from `location` when present

ALTER TABLE public.pending_stations
  ADD COLUMN IF NOT EXISTS station_location POINT;

-- Backfill existing rows where `location` exists
UPDATE public.pending_stations
SET station_location = location
WHERE station_location IS NULL AND location IS NOT NULL;

-- Keep both columns in sync on future updates via trigger
CREATE OR REPLACE FUNCTION public.sync_pending_stations_location_cols()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    NEW.station_location := COALESCE(NEW.station_location, NEW.location);
    NEW.location := COALESCE(NEW.location, NEW.station_location);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS sync_pending_stations_location_cols ON public.pending_stations;
CREATE TRIGGER sync_pending_stations_location_cols
  BEFORE INSERT OR UPDATE ON public.pending_stations
  FOR EACH ROW
  EXECUTE PROCEDURE public.sync_pending_stations_location_cols();

GRANT USAGE ON SCHEMA public TO authenticated;

-- Note: apply this migration via `supabase db push` or run in the Supabase SQL editor
