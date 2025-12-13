-- Create a secure function for agent registration that handles both auth and pending_agents entry
-- This allows for a more streamlined registration process from the client side

CREATE OR REPLACE FUNCTION public.register_new_agent(
  email TEXT,
  password TEXT,
  name TEXT,
  phone TEXT,
  service_type TEXT,
  license_number TEXT DEFAULT NULL,
  vehicle_info JSONB DEFAULT NULL,
  experience TEXT DEFAULT NULL,
  location TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  auth_user_id UUID;
  pending_agent_id UUID;
BEGIN
  -- First create the auth user
  auth_user_id := (SELECT id FROM auth.users WHERE auth.users.email = register_new_agent.email);
  
  IF auth_user_id IS NULL THEN
    -- Create the auth user if not exists
    INSERT INTO auth.users (
      email,
      raw_user_meta_data,
      created_at
    ) VALUES (
      email,
      jsonb_build_object(
        'name', name,
        'phone', phone,
        'service_type', service_type,
        'role', 'agent',
        'intent', 'agent_registration',
        'license_number', license_number,
        'vehicle_info', vehicle_info,
        'experience', experience,
        'location', location
      ),
      NOW()
    )
    RETURNING id INTO auth_user_id;
  END IF;
  
  -- Then create the pending agent entry
  -- This is a fallback in case the trigger fails or for direct API calls
  INSERT INTO public.pending_agents (
    auth_id,
    email,
    name,
    phone,
    service_type,
    license_number,
    vehicle_info,
    experience,
    location,
    status,
    created_at
  ) VALUES (
    auth_user_id,
    email,
    name,
    phone,
    service_type,
    license_number,
    vehicle_info,
    experience,
    location,
    'pending',
    NOW()
  )
  ON CONFLICT (auth_id) DO NOTHING
  RETURNING id INTO pending_agent_id;
  
  RETURN pending_agent_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to get the status of an agent application
CREATE OR REPLACE FUNCTION public.get_agent_application_status(auth_user_id UUID)
RETURNS TABLE (
  id UUID,
  status TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  admin_notes TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pa.id,
    pa.status,
    pa.created_at,
    pa.updated_at,
    pa.admin_notes
  FROM
    public.pending_agents pa
  WHERE
    pa.auth_id = auth_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
