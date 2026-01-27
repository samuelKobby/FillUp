-- Trigger to automatically create pending agent records when a user registers with agent role
-- This migration will create a trigger that runs after an insert on auth.users
-- It will check if the user registered with an agent role intent and create a record in pending_agents

-- First, let's create a function to handle the agent registration
CREATE OR REPLACE FUNCTION public.handle_new_agent_registration()
RETURNS TRIGGER AS $$
DECLARE
  user_email TEXT;
  user_name TEXT;
  user_phone TEXT;
  service_type TEXT;
BEGIN
  -- Get user metadata from the newly created auth user
  user_email := NEW.email;
  
  -- Extract name, phone, and service type from metadata if available
  -- Note: The path to these values depends on how you structure your registration form
  -- and how you pass the metadata to the createUser function
  user_name := NEW.raw_user_meta_data->>'name';
  user_phone := NEW.raw_user_meta_data->>'phone';
  service_type := NEW.raw_user_meta_data->>'service_type';
  
  -- Check if the user registered as an agent (based on metadata)
  -- You can customize this condition based on how you identify agent registrations
  IF NEW.raw_user_meta_data->>'role' = 'agent' OR NEW.raw_user_meta_data->>'intent' = 'agent_registration' THEN
    -- Insert a record into pending_agents
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
      user_email,
      COALESCE(user_name, 'New Agent'), -- Use a default if name isn't provided
      user_phone,
      COALESCE(service_type, 'fuel_delivery'), -- Default to fuel_delivery if not specified
      NEW.raw_user_meta_data->>'license_number',
      COALESCE(NEW.raw_user_meta_data->'vehicle_info', '{}'::jsonb),
      NEW.raw_user_meta_data->>'experience',
      NEW.raw_user_meta_data->>'location',
      'pending',
      NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger on auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_agent_registration();

-- Audit trail functionality for tracking application status changes
CREATE TABLE IF NOT EXISTS agent_application_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES pending_agents(id),
  previous_status TEXT,
  new_status TEXT NOT NULL,
  changed_by UUID,
  notes TEXT,
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create a trigger to track status changes
CREATE OR REPLACE FUNCTION log_agent_application_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO agent_application_history (
      application_id,
      previous_status,
      new_status,
      changed_by,
      notes,
      changed_at
    ) VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      NEW.reviewed_by,
      NEW.admin_notes,
      NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_agent_application_status_change ON pending_agents;
CREATE TRIGGER on_agent_application_status_change
  AFTER UPDATE ON pending_agents
  FOR EACH ROW EXECUTE PROCEDURE log_agent_application_changes();

-- Notification function to alert admins of new applications
CREATE OR REPLACE FUNCTION notify_admin_of_new_application()
RETURNS TRIGGER AS $$
BEGIN
  -- Notification functionality disabled for now
  -- TODO: Implement proper notification system
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- If any error occurs, silently continue
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Try to create the notification trigger if the notifications table exists
DO $$
BEGIN
  BEGIN
    -- This will fail silently if the notifications table doesn't exist
    DROP TRIGGER IF EXISTS on_new_agent_application ON pending_agents;
    CREATE TRIGGER on_new_agent_application
      AFTER INSERT ON pending_agents
      FOR EACH ROW EXECUTE PROCEDURE notify_admin_of_new_application();
  EXCEPTION
    WHEN undefined_table THEN
      -- Table doesn't exist yet, so we'll skip creating the trigger
      RAISE NOTICE 'Notifications table does not exist, skipping notification trigger creation';
  END;
END $$;
