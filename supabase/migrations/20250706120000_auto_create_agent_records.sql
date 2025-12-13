-- Migration: Auto-create agent records when users with role 'agent' are created
-- This eliminates the need for manual agent record creation

-- Function to automatically create agent record when user role is 'agent'
CREATE OR REPLACE FUNCTION auto_create_agent_record()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if this is a new user with role 'agent' or an existing user being updated to 'agent'
  IF (TG_OP = 'INSERT' AND NEW.role = 'agent') OR 
     (TG_OP = 'UPDATE' AND OLD.role != 'agent' AND NEW.role = 'agent') THEN
    
    -- Create agent record if it doesn't already exist
    INSERT INTO agents (
      user_id,
      service_type,
      is_verified,
      is_available,
      rating,
      total_jobs,
      created_at,
      updated_at
    )
    VALUES (
      NEW.id,
      'fuel_delivery', -- Default to fuel_delivery, can be updated later
      false, -- Default to unverified, admin can verify later
      true, -- Default to available
      5.0, -- Default rating
      0, -- No jobs initially
      NOW(),
      NOW()
    )
    ON CONFLICT (user_id) DO NOTHING; -- Prevent duplicates if record already exists
    
  END IF;
  
  -- If user role is changed from 'agent' to something else, optionally deactivate the agent
  IF TG_OP = 'UPDATE' AND OLD.role = 'agent' AND NEW.role != 'agent' THEN
    UPDATE agents 
    SET 
      is_available = false,
      updated_at = NOW()
    WHERE user_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on users table
DROP TRIGGER IF EXISTS trigger_auto_create_agent_record ON users;
CREATE TRIGGER trigger_auto_create_agent_record
  AFTER INSERT OR UPDATE OF role ON users
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_agent_record();

-- Also create agent records for any existing users with role 'agent' who don't have agent records yet
INSERT INTO agents (
  user_id,
  service_type,
  is_verified,
  is_available,
  rating,
  total_jobs,
  created_at,
  updated_at
)
SELECT 
  u.id,
  'fuel_delivery',
  false, -- Default to unverified
  true,  -- Default to available
  5.0,   -- Default rating
  0,     -- No jobs initially
  NOW(),
  NOW()
FROM users u
LEFT JOIN agents a ON u.id = a.user_id
WHERE u.role = 'agent' AND a.user_id IS NULL;

-- Comment explaining the automation
COMMENT ON FUNCTION auto_create_agent_record() IS 
'Automatically creates agent records when users are assigned the agent role. This eliminates the need for manual agent record creation and ensures all agent users appear in the station dashboard.';
