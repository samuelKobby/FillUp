-- Migration: Fix agent table flow - agents should be approved, pending_agents for applications
-- This fixes the backwards logic where we were using agents table for pending applications

-- Step 1: Update the auto_create_agent_record function to NOT create agents automatically
-- Instead, it should create pending_agents when role is 'agent'
CREATE OR REPLACE FUNCTION auto_create_agent_record()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if this is a new user with role 'agent' 
  IF (TG_OP = 'INSERT' AND NEW.role = 'agent') THEN
    
    -- Create pending agent application instead of approved agent
    INSERT INTO pending_agents (
      auth_id,
      email,
      name,
      phone,
      service_type,
      status,
      created_at
    )
    VALUES (
      NEW.id,
      NEW.email,
      NEW.name,
      NEW.phone,
      'fuel_delivery', -- Default service type
      'pending',
      NOW()
    )
    ON CONFLICT (auth_id) DO NOTHING; -- Prevent duplicates
    
  END IF;
  
  -- If user role is changed from 'agent' to something else, remove from pending if still there
  IF TG_OP = 'UPDATE' AND OLD.role = 'agent' AND NEW.role != 'agent' THEN
    UPDATE pending_agents 
    SET 
      status = 'cancelled',
      updated_at = NOW()
    WHERE auth_id = NEW.id AND status = 'pending';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Fix the handle_new_user function to also handle agent metadata correctly
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- First, always create the user profile
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
  
  -- If this is an agent registration with metadata, create pending_agents entry
  IF NEW.raw_user_meta_data->>'role' = 'agent' AND 
     NEW.raw_user_meta_data ? 'service_type' THEN
    
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
      NEW.id,
      NEW.email,
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'phone',
      NEW.raw_user_meta_data->>'service_type',
      NEW.raw_user_meta_data->>'license_number',
      COALESCE(NEW.raw_user_meta_data->'vehicle_info', '{}'::jsonb),
      NEW.raw_user_meta_data->>'experience',
      NEW.raw_user_meta_data->>'location',
      'pending',
      NOW()
    )
    ON CONFLICT (auth_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Step 3: Update approve_agent_application to move data from pending_agents to agents
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
  result JSON;
BEGIN
  -- Get the pending application
  SELECT * INTO app_record
  FROM pending_agents 
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
  
  -- Update pending_agents status
  UPDATE pending_agents 
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

-- Step 4: Migrate any existing incorrectly placed data
-- Move agents with is_verified=false to pending_agents (if not already there)
DO $$
DECLARE
  agent_rec RECORD;
  user_rec RECORD;
BEGIN
  FOR agent_rec IN 
    SELECT a.*, u.email, u.name, u.phone 
    FROM agents a 
    JOIN users u ON a.user_id = u.id 
    WHERE a.is_verified = false
  LOOP
    -- Check if already in pending_agents
    IF NOT EXISTS (SELECT 1 FROM pending_agents WHERE auth_id = agent_rec.user_id) THEN
      INSERT INTO pending_agents (
        auth_id,
        email,
        name,
        phone,
        service_type,
        license_number,
        vehicle_info,
        status,
        created_at
      ) VALUES (
        agent_rec.user_id,
        agent_rec.email,
        agent_rec.name,
        agent_rec.phone,
        agent_rec.service_type::text,
        agent_rec.license_number,
        agent_rec.vehicle_info,
        'pending',
        agent_rec.created_at
      );
      
      -- Remove from agents table since they're not actually approved
      DELETE FROM agents WHERE id = agent_rec.id;
      
      RAISE NOTICE 'Migrated unverified agent % to pending_agents', agent_rec.user_id;
    END IF;
  END LOOP;
END $$;

-- Log migration completion
SELECT 'Agent table flow fixed successfully' as migration_status;