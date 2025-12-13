-- Fix storage policies to support both user-id-first and folder-first patterns
-- This allows: userId/vehicles/image.png AND customers/image.png AND agents/image.png

DROP POLICY IF EXISTS "Anyone can view profile images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload profile images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own profile images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own profile images" ON storage.objects;

-- Public read access for all profile images
CREATE POLICY "Anyone can view profile images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'profile-images');

-- Upload policy supporting multiple folder structures:
-- 1. customers/userId-timestamp.ext
-- 2. agents/userId-timestamp.ext  
-- 3. userId/vehicles/vehicleId-timestamp.ext
CREATE POLICY "Authenticated users can upload profile images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-images' AND
  (
    -- Pattern 1 & 2: customers/ or agents/ folder with userId in filename
    (
      ((storage.foldername(name))[1] IN ('customers', 'agents')) AND
      ((storage.filename(name)) LIKE auth.uid()::text || '-%')
    ) OR
    
    -- Pattern 3: userId/vehicles/ structure
    (auth.uid()::text = (storage.foldername(name))[1])
  )
);

-- Update policy with same logic
CREATE POLICY "Users can update own profile images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profile-images' AND
  (
    (
      ((storage.foldername(name))[1] IN ('customers', 'agents')) AND
      ((storage.filename(name)) LIKE auth.uid()::text || '-%')
    ) OR
    (auth.uid()::text = (storage.foldername(name))[1])
  )
);

-- Delete policy with same logic
CREATE POLICY "Users can delete own profile images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'profile-images' AND
  (
    (
      ((storage.foldername(name))[1] IN ('customers', 'agents')) AND
      ((storage.filename(name)) LIKE auth.uid()::text || '-%')
    ) OR
    (auth.uid()::text = (storage.foldername(name))[1])
  )
);
