-- EMERGENCY FIX: Run this DIRECTLY in Supabase SQL Editor
-- Copy this ENTIRE file and paste it into Supabase Dashboard > SQL Editor > New Query

-- First, let's see what we're dealing with
SELECT 
    routine_name,
    routine_definition
FROM information_schema.routines 
WHERE routine_name = 'approve_agent_application'
AND routine_schema = 'public';

-- Now completely nuke and recreate
DROP FUNCTION IF EXISTS approve_agent_application_new(uuid, uuid, text) CASCADE;
DROP FUNCTION IF EXISTS approve_agent_application(uuid, uuid, text) CASCADE;

-- Create the clean version
CREATE FUNCTION approve_agent_application(
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
  user_exists boolean;
  agent_exists boolean;
BEGIN
  -- Get application details
  SELECT 
    auth_id, email, name, phone, service_type, license_number, vehicle_info, location
  INTO
    agent_auth_id, agent_email, agent_name, agent_phone, agent_service_type, agent_license_number, agent_vehicle_info, agent_location
  FROM pending_agents
  WHERE id = application_id AND status = 'pending';
  
  IF agent_auth_id IS NULL THEN
    RAISE EXCEPTION 'Invalid application ID or application is not pending';
  END IF;
  
  -- Check if user exists
  SELECT EXISTS(SELECT 1 FROM users WHERE id = agent_auth_id) INTO user_exists;
  
  IF NOT user_exists THEN
    BEGIN
      INSERT INTO users (
        id, email, role, name, phone, is_verified, is_active, created_at, updated_at
      ) VALUES (
        agent_auth_id, agent_email, 'agent', agent_name, agent_phone, true, true, now(), now()
      );
      approved_user_id := agent_auth_id;
    EXCEPTION
      WHEN unique_violation THEN
        approved_user_id := agent_auth_id;
    END;
  ELSE
    UPDATE users SET role = 'agent', is_verified = true, is_active = true, updated_at = now() WHERE id = agent_auth_id;
    approved_user_id := agent_auth_id;
  END IF;
  
  -- Check if agent exists
  SELECT EXISTS(SELECT 1 FROM agents WHERE user_id = approved_user_id) INTO agent_exists;
  
  IF NOT agent_exists THEN
    BEGIN
      INSERT INTO agents (
        user_id, service_type, license_number, vehicle_info, current_location,
        is_verified, is_available, rating, total_jobs, created_at, updated_at
      ) VALUES (
        approved_user_id, agent_service_type::service_type, agent_license_number, 
        agent_vehicle_info, '(0,0)', true, true, 5.0, 0, now(), now()
      );
    EXCEPTION
      WHEN unique_violation THEN
        UPDATE agents SET service_type = agent_service_type::service_type, license_number = agent_license_number,
        vehicle_info = agent_vehicle_info, is_verified = true, is_available = true, updated_at = now()
        WHERE user_id = approved_user_id;
    END;
  ELSE
    UPDATE agents SET service_type = agent_service_type::service_type, license_number = agent_license_number,
    vehicle_info = agent_vehicle_info, is_verified = true, is_available = true, updated_at = now()
    WHERE user_id = approved_user_id;
  END IF;
  
  -- Update pending_agents
  UPDATE pending_agents SET status = 'approved', admin_notes = COALESCE(admin_notes, 'Approved'),
  reviewed_at = now(), reviewed_by = admin_id, updated_at = now() WHERE id = application_id;
  
  RETURN approved_user_id;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to approve agent: %', SQLERRM;
END;
$$;

GRANT EXECUTE ON FUNCTION approve_agent_application(uuid, uuid, text) TO authenticated;

-- Verify it worked
SELECT 
    routine_name,
    'Function recreated successfully' as status
FROM information_schema.routines 
WHERE routine_name = 'approve_agent_application'
AND routine_schema = 'public';
