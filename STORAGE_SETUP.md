# Supabase Storage Setup

This document outlines the required storage buckets and policies for the FillUp application.

## Required Storage Buckets

### 1. station-images
For fuel station profile images and logos.

**Setup:**
- Bucket ID: `station-images`
- Public Access: Yes
- File Size Limit: 5MB per file

### 2. profile-images
For customer profile pictures.

**Setup:**
- Bucket ID: `profile-images`
- Public Access: Yes
- File Size Limit: 5MB per file

## Manual Setup Instructions

If the migrations don't automatically create the buckets, follow these steps:

### Option 1: Using Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **New bucket**
4. Create bucket with these settings:
   - **Name**: `profile-images`
   - **Public bucket**: ✅ Enabled
   - Click **Create bucket**
5. Repeat for `station-images` if not already created

### Option 2: Using SQL Editor

Run this SQL in your Supabase SQL Editor:

```sql
-- Create profile-images bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-images', 'profile-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create station-images bucket (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('station-images', 'station-images', true)
ON CONFLICT (id) DO NOTHING;
```

### Option 3: Run Migrations

If you have Supabase CLI installed:

```bash
# Apply all pending migrations
supabase db push

# Or apply specific migration
supabase migration up
```

## Storage Policies

The migrations automatically set up RLS policies for both buckets:

### profile-images policies:
- ✅ Anyone can view profile images (public read)
- ✅ Authenticated users can upload their own images
- ✅ Users can update their own images
- ✅ Users can delete their own images

### station-images policies:
- ✅ Anyone can view station images (public read)
- ✅ Authenticated stations can upload images
- ✅ Authenticated stations can update images
- ✅ Authenticated stations can delete images

## Verification

To verify the buckets are set up correctly:

1. Go to **Storage** in Supabase Dashboard
2. You should see both `profile-images` and `station-images` buckets
3. Both should have "Public" badge
4. Test upload by registering a new user and adding a profile picture

## Troubleshooting

### Error: "Bucket not found"
- Manually create the bucket using Dashboard or SQL Editor
- Ensure bucket name matches exactly: `profile-images` or `station-images`

### Error: "Row level security policy violation"
- Check that RLS policies are correctly set up
- Run the policy creation SQL from the migration files
- Ensure user is authenticated before attempting upload

### Error: "File size exceeds limit"
- Images must be under 5MB
- The application validates this before upload
- Reduce image size or compress before uploading

## File Structure

Profile images are stored with this structure:
```
profile-images/
  └── customers/
      └── {user-id}-{timestamp}.{ext}
```

Station images are stored with this structure:
```
station-images/
  └── stations/
      └── {station-id}-{timestamp}.{ext}
```
