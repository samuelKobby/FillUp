/*
  # Fix Admin User Setup

  This migration ensures the admin user is properly set up with the correct auth user ID.
  
  1. Check current auth users
  2. Update or create admin user with correct ID
  3. Verify setup
*/

-- First, let's see what auth users exist (this is just for debugging)
DO $$
DECLARE
    auth_user_record RECORD;
BEGIN
    -- Note: We can't directly query auth.users from a migration, but we can prepare for manual setup
    RAISE NOTICE 'Please check your Supabase Auth dashboard for the user ID of fueldrop048@gmail.com';
END $$;

-- Delete any existing admin user records to avoid conflicts
DELETE FROM users WHERE email = 'fueldrop048@gmail.com';

-- Create a function to set up admin user (to be called manually with correct ID)
CREATE OR REPLACE FUNCTION setup_admin_user(auth_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO users (
        id,
        email,
        role,
        name,
        phone,
        is_verified,
        is_active,
        created_at,
        updated_at
    ) VALUES (
        auth_user_id,
        'fueldrop048@gmail.com',
        'admin',
        'System Administrator',
        '+233248425044',
        true,
        true,
        now(),
        now()
    ) ON CONFLICT (id) DO UPDATE SET
        role = 'admin',
        name = 'System Administrator',
        email = 'fueldrop048@gmail.com',
        phone = '+233248425044',
        is_verified = true,
        is_active = true,
        updated_at = now();
        
    RAISE NOTICE 'Admin user setup complete for ID: %', auth_user_id;
END $$;

-- Instructions for manual setup
DO $$
BEGIN
    RAISE NOTICE '=== ADMIN USER SETUP INSTRUCTIONS ===';
    RAISE NOTICE '1. Go to your Supabase dashboard';
    RAISE NOTICE '2. Navigate to Authentication > Users';
    RAISE NOTICE '3. Find the user with email: fueldrop048@gmail.com';
    RAISE NOTICE '4. Copy the User ID (UUID)';
    RAISE NOTICE '5. Run: SELECT setup_admin_user(''YOUR_USER_ID_HERE'');';
    RAISE NOTICE '6. Replace YOUR_USER_ID_HERE with the actual UUID';
END $$;