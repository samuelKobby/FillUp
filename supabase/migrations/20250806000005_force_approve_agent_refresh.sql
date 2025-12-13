-- Force refresh of approve_agent_application function
-- This completely drops and recreates the function to clear any cache issues

-- First, revoke all permissions
REVOKE ALL ON FUNCTION approve_agent_application(uuid, uuid, text) FROM authenticated;
REVOKE ALL ON FUNCTION approve_agent_application(uuid, uuid, text) FROM PUBLIC;

-- Drop the function completely
DROP FUNCTION IF EXISTS approve_agent_application(uuid, uuid, text) CASCADE;

-- Wait a moment by doing a dummy operation
DO $$ BEGIN PERFORM pg_sleep(0.1); END $$;

-- Recreate the function with a clean slate
CREATE OR REPLACE FUNCTION approve_agent_application(
  application_id uuid,
  admin_id uuid,
  admin_notes text DEFAULT NULL
) RETURNS uuid 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
DECLARE
  approved_user_id uuid;
  agent_auth_id uuid;
  agent_email text;
  agent_name text;
  agent_phone text;
  agent_service_type text;
  agent_license_number text;
  agent_vehicle_info jsonb;
  agent_location text;
BEGIN
  -- Get the application details
  SELECT 
    auth_id, email, name, phone, service_type, license_number, vehicle_info, location
  INTO
    agent_auth_id, agent_email, agent_name, agent_phone, agent_service_type, agent_license_number, agent_vehicle_info, agent_location
  FROM pending_agents
  WHERE id = application_id AND status = 'pending';
  
  IF agent_auth_id IS NULL THEN
    RAISE EXCEPTION 'Invalid application ID or application is not pending';
  END IF;
  
  -- Check if the user already exists in the public.users table
  SELECT id INTO approved_user_id FROM users WHERE id = agent_auth_id;
  
  IF approved_user_id IS NULL THEN
    -- Create the public user record if it doesn't exist
    BEGIN
      INSERT INTO users (
        id, email, role, name, phone, is_verified, is_active, created_at, updated_at
      ) VALUES (
        agent_auth_id, 
        agent_email, 
        'agent', 
        agent_name,
        agent_phone,
        true,
        true,
        now(),
        now()
      )
      RETURNING id INTO approved_user_id;
    EXCEPTION
      WHEN unique_violation THEN
        -- If user already exists, just get the ID
        SELECT id INTO approved_user_id FROM users WHERE id = agent_auth_id;
        -- Update existing user to ensure they have agent role
        UPDATE users 
        SET 
          role = 'agent',
          is_verified = true,
          is_active = true,
          updated_at = now()
        WHERE id = approved_user_id;
    END;
  ELSE
    -- Update existing user to ensure they have agent role
    UPDATE users 
    SET 
      role = 'agent',
      is_verified = true,
      is_active = true,
      updated_at = now()
    WHERE id = approved_user_id;
  END IF;
  
  -- Check if the agent record already exists
  IF NOT EXISTS (SELECT 1 FROM agents WHERE user_id = approved_user_id) THEN
    -- Create the agent record (user_id is the primary key)
    INSERT INTO agents (
      user_id,
      service_type,
      license_number,
      vehicle_info,
      current_location,
      is_verified,
      is_available,
      rating,
      total_jobs,
      created_at,
      updated_at
    ) VALUES (
      approved_user_id,
      agent_service_type::service_type,
      agent_license_number,
      agent_vehicle_info,
      '(0,0)', -- Placeholder location as point type
      true,
      true,
      5.0,
      0,
      now(),
      now()
    );
  ELSE
    -- Update existing agent record
    UPDATE agents
    SET 
      service_type = agent_service_type::service_type,
      license_number = agent_license_number,
      vehicle_info = agent_vehicle_info,
      is_verified = true,
      is_available = true,
      updated_at = now()
    WHERE user_id = approved_user_id;
  END IF;
  
  -- Update the pending_agents record
  UPDATE pending_agents
  SET 
    status = 'approved',
    admin_notes = COALESCE(admin_notes, 'Approved'),
    reviewed_at = now(),
    reviewed_by = admin_id,
    updated_at = now()
  WHERE id = application_id;
  
  RETURN approved_user_id;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to approve agent application: %', SQLERRM;
END;
$$;

-- Grant execute permission to authenticated users only
GRANT EXECUTE ON FUNCTION approve_agent_application(uuid, uuid, text) TO authenticated;

-- Add a comment to track the version
COMMENT ON FUNCTION approve_agent_application(uuid, uuid, text) IS 'Version 5 - Force refresh without ON CONFLICT clauses';
