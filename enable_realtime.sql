-- Enable Realtime for orders table
ALTER TABLE public.orders REPLICA IDENTITY FULL;

-- Enable realtime publication for orders
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;

-- Enable Realtime for agents table (for agent status updates)
ALTER TABLE public.agents REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.agents;

-- Enable Realtime for stations table (for station updates)
ALTER TABLE public.stations REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.stations;

-- Enable Realtime for transactions table
ALTER TABLE public.transactions REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;

-- Enable Realtime for users table (for profile updates)
ALTER TABLE public.users REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.users;

-- Verify realtime is enabled
SELECT 
    schemaname,
    tablename,
    'Replica Identity: ' || CASE 
        WHEN relreplident = 'd' THEN 'DEFAULT'
        WHEN relreplident = 'n' THEN 'NOTHING'
        WHEN relreplident = 'f' THEN 'FULL'
        WHEN relreplident = 'i' THEN 'INDEX'
    END as replica_identity
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
JOIN pg_tables t ON t.tablename = c.relname AND t.schemaname = n.nspname
WHERE n.nspname = 'public' 
    AND c.relname IN ('orders', 'agents', 'stations', 'transactions', 'users')
ORDER BY c.relname;
