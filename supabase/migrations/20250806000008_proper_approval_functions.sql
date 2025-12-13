-- Create a proper function to handle agent approval without ON CONFLICT issues
-- This function will handle all the logic server-side

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
  
  -- Update or insert user (try update first)
  UPDATE users 
  SET 
    role = 'agent',
    is_verified = true,
    is_active = true,
    updated_at = now()
  WHERE id = app_record.auth_id;
  
  -- If no rows updated, insert new user
  IF NOT FOUND THEN
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
  END IF;
  
  -- Update or insert agent (try update first)
  UPDATE agents
  SET 
    service_type = app_record.service_type::service_type,
    license_number = app_record.license_number,
    vehicle_info = app_record.vehicle_info,
    is_verified = true,
    is_available = true,
    updated_at = now()
  WHERE user_id = app_record.auth_id;
  
  -- If no rows updated, insert new agent
  IF NOT FOUND THEN
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
  END IF;
  
  -- Update pending application status
  UPDATE pending_agents
  SET 
    status = 'approved',
    admin_notes = COALESCE(admin_notes, 'Approved'),
    reviewed_at = now(),
    reviewed_by = admin_id,
    updated_at = now()
  WHERE id = application_id;
  
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

-- Create reject function too
CREATE OR REPLACE FUNCTION reject_agent_application_v2(
  application_id uuid,
  admin_id uuid,
  admin_notes text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update pending application status
  UPDATE pending_agents
  SET 
    status = 'rejected',
    admin_notes = admin_notes,
    reviewed_at = now(),
    reviewed_by = admin_id,
    updated_at = now()
  WHERE id = application_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Application not found or already processed'
    );
  END IF;
  
  RETURN jsonb_build_object('success', true);
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION reject_agent_application_v2(uuid, uuid, text) TO authenticated;
