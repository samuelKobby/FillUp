-- Disable Row Level Security on pending_stations for troubleshooting
-- Drops the temporary policies created earlier and grants basic privileges

-- Disable RLS so the client can read/write during registration troubleshooting
ALTER TABLE IF EXISTS public.pending_stations
  DISABLE ROW LEVEL SECURITY;

-- Drop the policies we created earlier (safe if they don't exist)
DROP POLICY IF EXISTS users_can_insert_pending_stations ON public.pending_stations;
DROP POLICY IF EXISTS users_can_update_own_pending_stations ON public.pending_stations;

-- Grant common privileges to the authenticated role so anon/clients with anon key can use REST
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pending_stations TO authenticated;

-- Note: This removes row-level protection. Re-enable RLS and policies after debugging.
