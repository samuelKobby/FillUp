-- Add unique constraint to agents.user_id if it doesn't exist
-- This is needed for the ON CONFLICT clause in the approval function

-- First, check if there are any duplicate user_ids and clean them up
-- Keep only the oldest record for each user_id
DELETE FROM agents a
WHERE a.ctid NOT IN (
  SELECT ctid
  FROM (
    SELECT ctid, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at) as rn
    FROM agents
  ) sub
  WHERE rn = 1
);

-- Add unique constraint on user_id (only if it doesn't exist)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'agents_user_id_unique'
  ) THEN
    ALTER TABLE agents ADD CONSTRAINT agents_user_id_unique UNIQUE (user_id);
  END IF;
END $$;

-- Now recreate the approval function with proper handling
CREATE OR REPLACE FUNCTION approve_agent_application_v2(
  application_id uuid,
  admin_id uuid,
  admin_notes text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  app_record record;
  result jsonb;
BEGIN
  -- Get application details
  SELECT * INTO app_record
  FROM pending_agents
  WHERE id = application_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Application not found or already processed'
    );
  END IF;
  
  -- Insert or update user
  INSERT INTO users (
    id, email, role, name, phone, is_verified, is_active, created_at, updated_at
  ) VALUES (
    app_record.auth_id,
    app_record.email,
    'agent',
    app_record.name,
    app_record.phone,
    true,
    true,
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    role = 'agent',
    is_verified = true,
    is_active = true,
    updated_at = now();
  
  -- Insert or update agent
  INSERT INTO agents (
    user_id, service_type, license_number, vehicle_info,
    current_location, is_verified, is_available, rating, total_jobs,
    created_at, updated_at
  ) VALUES (
    app_record.auth_id,
    app_record.service_type::service_type,
    app_record.license_number,
    app_record.vehicle_info,
    '(0,0)',
    true,
    true,
    5.0,
    0,
    now(),
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    service_type = app_record.service_type::service_type,
    license_number = app_record.license_number,
    vehicle_info = app_record.vehicle_info,
    is_verified = true,
    is_available = true,
    updated_at = now();
  
  -- Update pending application status
  UPDATE pending_agents
  SET 
    status = 'approved',
    admin_notes = COALESCE(approve_agent_application_v2.admin_notes, 'Approved'),
    reviewed_at = now(),
    reviewed_by = approve_agent_application_v2.admin_id,
    updated_at = now()
  WHERE id = approve_agent_application_v2.application_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'user_id', app_record.auth_id
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION approve_agent_application_v2(uuid, uuid, text) TO authenticated;
