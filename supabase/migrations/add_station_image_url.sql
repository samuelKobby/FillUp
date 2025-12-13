-- Add image_url column to stations table
ALTER TABLE stations ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Create storage bucket for station images
INSERT INTO storage.buckets (id, name, public)
VALUES ('station-images', 'station-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for station images
CREATE POLICY "Public can view station images"
ON storage.objects FOR SELECT
USING (bucket_id = 'station-images');

CREATE POLICY "Stations can upload their own images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'station-images' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Stations can update their own images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'station-images'
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Stations can delete their own images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'station-images'
  AND auth.role() = 'authenticated'
);
