-- Fix RLS policy to allow agents to see pending_acceptance orders
-- This is needed for mechanic orders that are directly assigned with pending_acceptance status

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
    -- Orders assigned to this agent (including pending_acceptance for mechanics)
    (agent_id IN (
      SELECT id FROM agents WHERE user_id = auth.uid()
    ))
    OR
    -- Orders in progress or completed by this agent
    (status IN ('in_progress', 'completed', 'cancelled') AND agent_id IN (
      SELECT id FROM agents WHERE user_id = auth.uid()
    ))
  )
);

COMMENT ON POLICY "orders_agent_select_policy" ON orders IS 
'Allows agents to view orders available for acceptance (status=accepted, agent_id=null) and ALL orders assigned to them (including pending_acceptance for mechanics)';
