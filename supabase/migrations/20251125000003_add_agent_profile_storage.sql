-- Add support for agent profile images in profile-images bucket
-- This ensures agents can upload profile pictures to the agents/ folder

-- The existing policies already support nested folders through foldername() function
-- This migration adds explicit documentation and ensures the bucket supports agent images

-- Verify bucket exists and is public
DO $$
BEGIN
  -- Update bucket settings if needed
  UPDATE storage.buckets
  SET 
    public = true,
    file_size_limit = 5242880, -- 5MB
    allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
  WHERE id = 'profile-images';
  
  -- Log success
  RAISE NOTICE 'Profile images bucket configured for agent profiles';
END $$;

-- The existing policies from 20251125000002_fix_vehicle_storage_policy.sql already support:
-- 1. Anyone can view profile images (public read)
-- 2. Authenticated users can upload to their user folder (agents/, customers/, vehicles/)
-- 3. Users can update their own images
-- 4. Users can delete their own images

-- Add a comment to the users table for avatar_url clarity
COMMENT ON COLUMN users.avatar_url IS 'URL to user profile image stored in profile-images bucket. Supports customers/ and agents/ folders.';

-- Verify the storage policies are working
DO $$
BEGIN
  -- Check if policies exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Anyone can view profile images'
  ) THEN
    RAISE EXCEPTION 'Storage policy "Anyone can view profile images" not found. Run migration 20251125000002_fix_vehicle_storage_policy.sql first.';
  END IF;
  
  RAISE NOTICE 'Agent profile storage is ready';
END $$;
