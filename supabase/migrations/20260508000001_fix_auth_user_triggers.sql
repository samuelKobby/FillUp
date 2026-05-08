/*
  # Fix auth.users triggers (profile + agent registration)

  Problem:
  - A previous migration replaced the `on_auth_user_created` trigger to only run agent-registration logic.
  - That can stop creating `public.users` rows for new auth users (including Google OAuth).

  Solution:
  - Keep the profile-creation trigger (handle_new_user)
  - Add a separate trigger for agent registration

  Safe to run:
  - Drops the conflicting `on_auth_user_created` trigger name if present
  - Creates two triggers with distinct names
*/

-- Ensure profile creation function exists
CREATE OR REPLACE FUNCTION public.handle_new_user()
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

-- Drop the conflicting trigger name (used by older migrations)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create/restore profile trigger
DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create agent registration trigger if the function exists
DO $$
BEGIN
  IF to_regproc('public.handle_new_agent_registration') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS on_auth_user_created_agent_registration ON auth.users;
    CREATE TRIGGER on_auth_user_created_agent_registration
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_new_agent_registration();
  END IF;
END $$;
