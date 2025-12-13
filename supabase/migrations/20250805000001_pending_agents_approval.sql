-- Create the pending_agents table to store agent applications awaiting admin approval

CREATE TABLE IF NOT EXISTS pending_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id uuid NOT NULL UNIQUE, -- Reference to the auth.users table ID
  email text NOT NULL,
  name text NOT NULL,
  phone text,
  service_type text NOT NULL CHECK (service_type IN ('fuel_delivery', 'mechanic', 'both')),
  license_number text,
  vehicle_info jsonb,
  experience text,
  location text,
  status text NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  admin_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid -- Reference to the admin user who reviewed this application
);

-- Add RLS policies
ALTER TABLE pending_agents ENABLE ROW LEVEL SECURITY;

-- Only admins can see and manage all pending agent applications
CREATE POLICY "Admins can manage pending agents" 
  ON pending_agents 
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );
  
-- Users can see their own pending applications by auth_id
CREATE POLICY "Users can view their own pending applications"
  ON pending_agents
  FOR SELECT
  TO authenticated
  USING (auth_id = auth.uid());

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_pending_agents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER update_pending_agents_updated_at
  BEFORE UPDATE ON pending_agents
  FOR EACH ROW
  EXECUTE FUNCTION update_pending_agents_updated_at();

-- Create a function for admins to approve agent applications
CREATE OR REPLACE FUNCTION approve_agent_application(
  application_id uuid,
  admin_id uuid,
  admin_notes text DEFAULT NULL
) RETURNS uuid AS $$
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
    INSERT INTO users (
      id, email, role, name, phone, is_verified, is_active, created_at, updated_at
    ) VALUES (
      agent_auth_id, 
      agent_email, 
      'agent', 
      agent_name,
      agent_phone,
      true,  -- is_verified
      true,  -- is_active
      now(),
      now()
    )
    RETURNING id INTO approved_user_id;
  END IF;
  
  -- Check if the agent record already exists
  IF NOT EXISTS (SELECT 1 FROM agents WHERE user_id = approved_user_id) THEN
    -- Create the agent record
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
  END IF;
  
  -- Update the pending_agents record
  UPDATE pending_agents
  SET 
    status = 'approved',
    admin_notes = COALESCE(admin_notes, ''),
    reviewed_at = now(),
    reviewed_by = admin_id
  WHERE id = application_id;
  
  RETURN approved_user_id;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'User or agent record already exists for this application';
  WHEN foreign_key_violation THEN
    RAISE EXCEPTION 'Referenced record not found. Check that the user exists in auth.users';
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to approve agent application: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION approve_agent_application TO authenticated;

-- Create a function for admins to reject agent applications
CREATE OR REPLACE FUNCTION reject_agent_application(
  application_id uuid,
  admin_id uuid,
  admin_notes text DEFAULT NULL
) RETURNS boolean AS $$
BEGIN
  -- Update the pending_agents record
  UPDATE pending_agents
  SET 
    status = 'rejected',
    admin_notes = COALESCE(admin_notes, ''),
    reviewed_at = now(),
    reviewed_by = admin_id
  WHERE id = application_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid application ID or application is not pending';
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION reject_agent_application TO authenticated;
