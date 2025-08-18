-- Complete User Management Module Setup Script
-- Run this script to set up the entire user management system

-- 1. Create users table (if not exists)
\i sql/users.sql

-- 2. Create audit logs table
\i sql/audit_logs.sql

-- 3. Create performance indexes
\i sql/user_indexes.sql

-- 4. Insert sample departments data (optional)
INSERT INTO public.users (name, email, role, department, status, created_by, updated_by) 
VALUES 
  ('System Admin', 'admin@mediente.com', 'HOD', 'IT', true, 
   (SELECT id FROM admin_users LIMIT 1), 
   (SELECT id FROM admin_users LIMIT 1))
ON CONFLICT (email) DO NOTHING;

-- 5. Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.audit_logs TO authenticated;

-- 6. Enable RLS policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for users table
DROP POLICY IF EXISTS "Admin users can manage all users" ON public.users;
CREATE POLICY "Admin users can manage all users" ON public.users
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 7. Create storage bucket for user photos (run in Supabase dashboard)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('user-photos', 'user-photos', true);

-- 8. Set up storage policies for user photos
-- CREATE POLICY "Allow authenticated uploads" ON storage.objects
-- FOR INSERT TO authenticated
-- WITH CHECK (bucket_id = 'user-photos');

-- CREATE POLICY "Allow public viewing" ON storage.objects
-- FOR SELECT TO public
-- USING (bucket_id = 'user-photos');

COMMIT;
