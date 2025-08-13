# 🗂️ Supabase Storage Setup Guide for User Photos

## 🚨 **IMPORTANT: Run these commands in Supabase Dashboard**

The photo upload feature requires a storage bucket to be created in Supabase. Follow these steps:

## 📋 **Step 1: Create Storage Bucket**

Go to **Supabase Dashboard > Storage** and run this SQL command:

```sql
-- Create the user-photos bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'user-photos',
  'user-photos',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
);
```

## 🔐 **Step 2: Set Storage Policies**

After creating the bucket, run these policy commands:

```sql
-- Allow public read access to all photos
CREATE POLICY "Public Access" ON storage.objects
FOR SELECT USING (bucket_id = 'user-photos');

-- Allow authenticated users to upload photos
CREATE POLICY "Authenticated users can upload photos" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'user-photos' 
  AND auth.role() = 'authenticated'
);

-- Allow users to update their own photos
CREATE POLICY "Users can update their own photos" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'user-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own photos
CREATE POLICY "Users can delete their own photos" ON storage.objects
FOR DELETE USING (
  bucket_id = 'user-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

## 🎯 **Alternative: Manual Bucket Creation**

If the SQL approach doesn't work, create the bucket manually:

1. Go to **Supabase Dashboard > Storage**
2. Click **"New Bucket"**
3. Set **Bucket name**: `user-photos`
4. Check **"Public bucket"** (for public read access)
5. Set **File size limit**: `5 MB`
6. Set **Allowed MIME types**: `image/*`
7. Click **"Create bucket"**

## 🔧 **Step 3: Verify Setup**

After creating the bucket, you should see:
- ✅ Bucket `user-photos` appears in Storage list
- ✅ Bucket is marked as "Public"
- ✅ Policies are applied correctly

## 🚀 **Step 4: Test Photo Upload**

Once the bucket is set up:
1. Go to your user management page
2. Try to add/edit a user with a photo
3. The photo should upload successfully
4. You should see the photo displayed in the avatar

## 🆘 **Troubleshooting**

### **Error: "Bucket not found"**
- Ensure the bucket name is exactly `user-photos`
- Check that the bucket was created successfully
- Verify you're in the correct Supabase project

### **Error: "Access denied"**
- Check that storage policies are set correctly
- Ensure the bucket is marked as "Public"
- Verify your user has authenticated access

### **Error: "File too large"**
- Check the file size limit (should be 5MB)
- Ensure the file is actually an image

### **Error: "Invalid MIME type"**
- Check that `image/*` is in allowed MIME types
- Ensure the file has a proper image extension

## 📱 **File Requirements**

- **Supported formats**: JPEG, PNG, GIF, WebP
- **Maximum size**: 5MB
- **Recommended dimensions**: 150x150px or larger
- **Aspect ratio**: Square (1:1) recommended

## 🔄 **Fallback Behavior**

If photo upload fails:
- The system will continue without the photo
- A default avatar icon will be displayed
- The user will be created/updated successfully
- An error notification will be shown

---

## 🎬 **For Mediente Film Production**

This setup allows your production team to:
- Upload profile photos for cast and crew
- Maintain visual identification in the system
- Store photos securely in Supabase
- Access photos from anywhere in the application

**Need help?** Check the Supabase documentation or contact your development team.

