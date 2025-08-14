-- Users table for Mediente Admin User Management
CREATE TABLE IF NOT EXISTS public.users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('Admin', 'HOD', 'Associate', 'Crew')),
    department TEXT NOT NULL,
    reporting_manager TEXT,
    status BOOLEAN DEFAULT true,
    photo_url TEXT,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.admin_users(id),
    updated_by UUID REFERENCES public.admin_users(id)
);

-- Add photo_url column if it doesn't exist (for existing databases)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'photo_url') THEN
        ALTER TABLE public.users ADD COLUMN photo_url TEXT;
    END IF;
END $$;

-- Audit logs table for tracking all user management actions
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    action TEXT NOT NULL,
    admin_user UUID REFERENCES public.admin_users(id),
    target_user UUID REFERENCES public.users(id),
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    ip_address TEXT,
    device_details TEXT,
    details JSONB,
    old_values JSONB,
    new_values JSONB
);

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for users updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert sample users for testing
INSERT INTO public.users (name, email, role, department, reporting_manager, status, photo_url) 
VALUES 
    ('Ethan Carter', 'ethan.carter@mediente.com', 'Admin', 'Film', NULL, true, 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face'),
    ('Olivia Bennett', 'olivia.bennett@mediente.com', 'HOD', 'Talent', NULL, true, 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face'),
    ('Liam Harper', 'liam.harper@mediente.com', 'Associate', 'Location', 'Olivia Bennett', false, 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face'),
    ('Liam Harper', 'liam.harper2@mediente.com', 'Associate', 'Location', 'Olivia Bennett', true, 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face'),
    ('Liam Harper', 'liam.harper3@mediente.com', 'Associate', 'Location', 'Olivia Bennett', true, 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=face'),
    ('Emma Rodriguez', 'emma.rodriguez@mediente.com', 'HOD', 'Film', NULL, true, 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face'),
    ('Noah Thompson', 'noah.thompson@mediente.com', 'Associate', 'Talent', 'Olivia Bennett', true, 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=face'),
    ('Ava Martinez', 'ava.martinez@mediente.com', 'Crew', 'Film', 'Emma Rodriguez', true, 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face'),
    ('William Garcia', 'william.garcia@mediente.com', 'Crew', 'Location', 'Liam Harper', true, 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face'),
    ('Sophia Lee', 'sophia.lee@mediente.com', 'Associate', 'Film', 'Emma Rodriguez', true, 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face')
ON CONFLICT (email) DO NOTHING;

-- Row Level Security policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY "Enable read access for authenticated users" ON public.users
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users" ON public.users
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" ON public.users
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users" ON public.users
    FOR DELETE USING (auth.role() = 'authenticated');

-- Audit logs policies
CREATE POLICY "Enable insert for audit logs" ON public.audit_logs
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable read for authenticated users" ON public.audit_logs
    FOR SELECT USING (auth.role() = 'authenticated');

-- Grant permissions
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.users TO anon;
GRANT ALL ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO anon;

-- Create storage bucket for user photos (run this in Supabase dashboard)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('user-photos', 'user-photos', true);
-- CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'user-photos');
-- CREATE POLICY "Authenticated users can upload photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'user-photos' AND auth.role() = 'authenticated');
-- CREATE POLICY "Users can update their own photos" ON storage.objects FOR UPDATE USING (bucket_id = 'user-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_department ON public.users(department);
CREATE INDEX IF NOT EXISTS idx_users_status ON public.users(status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
