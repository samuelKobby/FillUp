-- Allow authenticated users to insert their own pending_stations rows
-- This enables the client-side fallback insert when the auth trigger hasn't populated the row yet

-- Create policy for INSERT so users can create their own application
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'users_can_insert_pending_stations'
  ) THEN
    CREATE POLICY users_can_insert_pending_stations
      ON public.pending_stations
      FOR INSERT
      TO authenticated
      WITH CHECK (auth_id = auth.uid());
  END IF;
END$$;

-- Optionally allow users to update their own application (e.g., to add image_url)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'users_can_update_own_pending_stations'
  ) THEN
    CREATE POLICY users_can_update_own_pending_stations
      ON public.pending_stations
      FOR UPDATE
      TO authenticated
      USING (auth_id = auth.uid())
      WITH CHECK (auth_id = auth.uid());
  END IF;
END$$;

-- Note: apply via Supabase SQL editor or migrations tooling
