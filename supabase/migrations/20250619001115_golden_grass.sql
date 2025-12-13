/*
  # Create automatic user profile creation trigger

  1. New Functions
    - `handle_new_user()` - Automatically creates user profile when auth user is created
    - Uses SECURITY DEFINER to bypass RLS policies
    - Extracts user data from raw_user_meta_data

  2. New Triggers
    - `on_auth_user_created` - Fires when new user is created in auth.users
    - Calls handle_new_user() function automatically

  3. Security
    - Function runs with elevated privileges to bypass RLS
    - Only creates profiles for newly authenticated users
    - Safely handles missing metadata
*/

-- Create function to handle new user creation
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

-- Create trigger to automatically create user profile
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();