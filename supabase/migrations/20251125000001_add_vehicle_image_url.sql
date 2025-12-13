-- Add image_url column to vehicles table
ALTER TABLE vehicles
ADD COLUMN IF NOT EXISTS image_url text;

-- Add comment
COMMENT ON COLUMN vehicles.image_url IS 'URL to the vehicle image stored in Supabase Storage';
