-- Migration: Simplify to 2 tables - agent_applications and agents
-- Fix authentication flow so only approved agents can login

-- Step 1: Create agent_applications table (replaces pending_agents)
CREATE TABLE IF NOT EXISTS agent_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  service_type TEXT NOT NULL,
  license_number TEXT,
  vehicle_info JSONB,
  experience TEXT,
  location TEXT,
  profile_image_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(auth_id)
);

-- Step 2: Migrate data from pending_agents to agent_applications
INSERT INTO agent_applications (
  auth_id, email, name, phone, service_type, license_number,
  vehicle_info, experience, location, profile_image_url, status,
  admin_notes, reviewed_by, reviewed_at, created_at, updated_at
)
SELECT 
  auth_id, email, name, phone, service_type, license_number,
  vehicle_info, experience, location, profile_image_url, status,
  admin_notes, reviewed_by, reviewed_at, created_at, updated_at
FROM pending_agents
ON CONFLICT (auth_id) DO NOTHING;

-- Step 3: Update handle_new_user function to only create user profile
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only create the user profile, let AgentRegister handle agent_applications
  INSERT INTO public.users (
    id,
    email,
    role,
    name,
    phone,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'customer')::user_role,
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'phone',
    NOW(),
    NOW()
  );
  
  RETURN NEW;
END;
$$;

-- Step 4: Update approve_agent_application to move from agent_applications to agents
DROP FUNCTION IF EXISTS approve_agent_application(UUID, UUID, TEXT);
CREATE OR REPLACE FUNCTION approve_agent_application(
  application_id UUID,
  admin_id UUID,
  admin_notes TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  app_record RECORD;
  user_record RECORD;
BEGIN
  -- Get the pending application
  SELECT * INTO app_record
  FROM agent_applications 
  WHERE id = application_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Application not found or already processed'
    );
  END IF;
  
  -- Get the user record
  SELECT * INTO user_record
  FROM users
  WHERE id = app_record.auth_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User record not found'
    );
  END IF;
  
  -- Update agent_applications status
  UPDATE agent_applications 
  SET 
    status = 'approved',
    admin_notes = approve_agent_application.admin_notes,
    reviewed_by = admin_id,
    reviewed_at = NOW(),
    updated_at = NOW()
  WHERE id = application_id;
  
  -- Create the approved agent record in agents table
  INSERT INTO agents (
    user_id,
    service_type,
    vehicle_info,
    license_number,
    is_verified,
    is_available,
    rating,
    total_jobs,
    specialties,
    active_order_count,
    max_active_orders,
    created_at,
    updated_at
  ) VALUES (
    app_record.auth_id,
    app_record.service_type::service_type,
    COALESCE(app_record.vehicle_info, '{}'::jsonb),
    app_record.license_number,
    true, -- Agent is verified upon approval
    true, -- Available by default
    5.0,  -- Default rating
    0,    -- No jobs initially
    COALESCE(
      CASE 
        WHEN app_record.service_type = 'mechanic' THEN '["general_repair"]'::jsonb
        WHEN app_record.service_type = 'both' THEN '["fuel_delivery", "general_repair"]'::jsonb
        ELSE '["fuel_delivery"]'::jsonb
      END, 
      '[]'::jsonb
    ),
    0, -- No active orders
    CASE 
      WHEN app_record.service_type = 'mechanic' THEN 3
      ELSE 5
    END, -- Max orders
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    service_type = EXCLUDED.service_type,
    vehicle_info = EXCLUDED.vehicle_info,
    license_number = EXCLUDED.license_number,
    is_verified = true,
    updated_at = NOW();
  
  RETURN json_build_object(
    'success', true,
    'message', 'Agent application approved successfully'
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Step 5: Create function to check if agent is approved
CREATE OR REPLACE FUNCTION is_agent_approved(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user exists in agents table (means approved)
  RETURN EXISTS (SELECT 1 FROM agents WHERE user_id = is_agent_approved.user_id AND is_verified = true);
END;
$$;

-- Step 6: Add RLS policies for agent_applications
ALTER TABLE agent_applications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own applications
DROP POLICY IF EXISTS "Users can view own applications" ON agent_applications;
CREATE POLICY "Users can view own applications" ON agent_applications
  FOR SELECT USING (auth.uid() = auth_id);

-- Policy: Users can insert their own applications  
DROP POLICY IF EXISTS "Users can create applications" ON agent_applications;
CREATE POLICY "Users can create applications" ON agent_applications
  FOR INSERT WITH CHECK (auth.uid() = auth_id);

-- Policy: Admins can view all applications
DROP POLICY IF EXISTS "Admins can view all applications" ON agent_applications;
CREATE POLICY "Admins can view all applications" ON agent_applications
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Step 7: Clean up old data and tables (after confirming migration works)
-- DROP TABLE IF EXISTS pending_agents; -- Uncomment after testing

-- Log migration completion
SELECT 'Agent applications flow simplified successfully' as migration_status;