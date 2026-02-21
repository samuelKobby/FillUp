-- EMERGENCY FIX: Allow agents to see pending_acceptance orders
-- Run this in Supabase SQL Editor immediately

-- Fix the RLS policy to include pending_acceptance status
DROP POLICY IF EXISTS "orders_agent_select_policy" ON orders;

CREATE POLICY "orders_agent_select_policy"
ON orders
FOR SELECT
TO authenticated
USING (
  -- Allow agents to see orders they can accept or are assigned to
  EXISTS (
    SELECT 1 FROM agents
    WHERE agents.user_id = auth.uid()
  ) 
  AND (
    -- Orders available for agents to accept (status = 'accepted', no agent assigned)
    (status = 'accepted' AND agent_id IS NULL)
    OR
    -- Orders assigned to this agent (any status including pending_acceptance)
    (agent_id IN (
      SELECT id FROM agents WHERE user_id = auth.uid()
    ))
  )
);

COMMENT ON POLICY "orders_agent_select_policy" ON orders IS 
'Allows agents to view orders available for acceptance and ALL orders assigned to them regardless of status (including pending_acceptance for mechanic orders)';
