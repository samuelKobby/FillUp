-- REVERT MIGRATION: Go back to the working 3-table system
-- This undoes all changes from the table simplification attempts

-- Step 1: Drop the problematic agent_applications table
DROP TABLE IF EXISTS agent_applications CASCADE;

-- Step 2: Ensure pending_agents table exists with correct structure
CREATE TABLE IF NOT EXISTS pending_agents (
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

-- Step 3: Disable RLS on pending_agents 
ALTER TABLE pending_agents DISABLE ROW LEVEL SECURITY;

-- Step 4: Restore the original working handle_new_user trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();
DROP FUNCTION IF EXISTS handle_new_user_simple();

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
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

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Step 5: Restore approve_agent_application to work with pending_agents
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

-- Step 6: Fix storage policies for profile images
UPDATE storage.buckets 
SET public = true 
WHERE id = 'profile-images';

DROP POLICY IF EXISTS "Allow profile image uploads" ON storage.objects;
CREATE POLICY "Allow profile image uploads" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'profile-images');

DROP POLICY IF EXISTS "Allow profile image access" ON storage.objects;
CREATE POLICY "Allow profile image access" ON storage.objects
  FOR SELECT USING (bucket_id = 'profile-images');

-- Log revert completion
SELECT 'Reverted to working 3-table system successfully' as revert_status;