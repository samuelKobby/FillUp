-- Enable agents to view orders for accepting and managing deliveries
-- Agents need to see:
-- 1. Orders with status 'accepted' (available to pick up)
-- 2. Orders assigned to them (agent_id = their id)

-- Drop existing restrictive policy if it exists
DROP POLICY IF EXISTS "orders_agent_select_policy" ON orders;

-- Create new policy allowing agents to see relevant orders
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
    -- Orders assigned to this agent
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

-- Also allow agents to UPDATE orders they're assigned to
DROP POLICY IF EXISTS "orders_agent_update_policy" ON orders;

CREATE POLICY "orders_agent_update_policy"
ON orders
FOR UPDATE
TO authenticated
USING (
  -- Agents can update orders assigned to them
  agent_id IN (
    SELECT id FROM agents WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  -- Agents can update orders assigned to them
  agent_id IN (
    SELECT id FROM agents WHERE user_id = auth.uid()
  )
);

-- Comment for documentation
COMMENT ON POLICY "orders_agent_select_policy" ON orders IS 
'Allows agents to view orders available for acceptance (status=accepted, agent_id=null) and orders assigned to them';

COMMENT ON POLICY "orders_agent_update_policy" ON orders IS 
'Allows agents to update status and details of orders assigned to them';
