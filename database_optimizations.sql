-- Optimizations for user creation and management

-- First, let's make sure the auto sync from auth.users to public.users is working

-- Create or replace the function that will be triggered on new user auth creation
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  -- Insert the new user into our public users table with data from auth.users
  INSERT INTO public.users (id, email, role, name, phone, is_verified, is_active, created_at, updated_at)
  VALUES (
    NEW.id, 
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'customer'),
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.raw_user_meta_data->>'phone',
    CASE WHEN NEW.email_confirmed_at IS NULL THEN false ELSE true END,
    true,
    NOW(),
    NOW()
  );
  
  RETURN NEW;
EXCEPTION
  -- If there's an error, log it to the error logs table
  WHEN OTHERS THEN
    INSERT INTO public.error_logs (error_type, description, payload)
    VALUES ('user_creation_failed', SQLERRM, row_to_json(NEW));
    RETURN NEW; -- Still allow the auth user to be created
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create error logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  error_type text NOT NULL,
  description text NOT NULL,
  payload jsonb,
  created_at timestamptz DEFAULT now()
);

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Recreate the trigger to call our function when new users are created in auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Fix permissions on the users table for proper row level security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for accessing error logs (admin only)
CREATE POLICY "Admins can see error logs"
  ON public.error_logs
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND role = 'admin'
  ));

-- Manually sync any existing auth users that might not have public user records
INSERT INTO public.users (id, email, role, name, is_verified, is_active, created_at, updated_at)
SELECT 
  au.id,
  au.email,
  'customer'::user_role, -- Default to customer role
  COALESCE(au.raw_user_meta_data->>'name', au.email),
  CASE WHEN au.email_confirmed_at IS NULL THEN false ELSE true END,
  true,
  NOW(),
  NOW()
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL;
