/*
  # Create Admin User for Testing

  1. New Admin User
    - Creates a test admin user in the users table
    - Email: admin@fillup.gh
    - Role: admin
    - Name: System Administrator
    - Phone: +233 50 000 0000
    - Verified and active by default

  2. Important Notes
    - You must create the corresponding auth user in Supabase Auth dashboard
    - Use the same email (admin@fillup.gh) and set a secure password
    - Copy the auth user ID and update the INSERT statement below
    - This is for testing purposes only

  3. Security
    - Admin user is verified and active by default
    - Has full admin privileges through existing RLS policies
*/

-- Insert admin user (replace 'YOUR_AUTH_USER_ID_HERE' with actual auth user ID)
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
  'b92ac311-087c-46d7-a0f2-fea50adecc24', -- Replace with actual auth user ID from Supabase Auth
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
  is_verified = true,
  is_active = true,
  updated_at = now();

-- Verify the admin user was created
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM users WHERE email = 'fueldrop048@gmail.com' AND role = 'admin') THEN
    RAISE NOTICE 'Admin user created successfully';
  ELSE
    RAISE NOTICE 'Admin user creation failed - please check the auth user ID';
  END IF;
END $$;