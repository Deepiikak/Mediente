-- Enable Row Level Security
ALTER TABLE IF EXISTS public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.login_attempts ENABLE ROW LEVEL SECURITY;

-- Create admin_users table
CREATE TABLE IF NOT EXISTS public.admin_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create login_attempts table for security logging
CREATE TABLE IF NOT EXISTS public.login_attempts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL,
    ip_address TEXT,
    success BOOLEAN DEFAULT false,
    attempted_at TIMESTAMPTZ DEFAULT NOW(),
    user_agent TEXT,
    error_message TEXT
);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for admin_users updated_at
DROP TRIGGER IF EXISTS update_admin_users_updated_at ON public.admin_users;
CREATE TRIGGER update_admin_users_updated_at
    BEFORE UPDATE ON public.admin_users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert a default admin user (password should be set via Supabase Auth)
-- Note: You'll need to create this user in Supabase Auth separately and then insert the record here
INSERT INTO public.admin_users (email, name, role, is_active) 
VALUES ('admin@mediente.com', 'System Administrator', 'super_admin', true)
ON CONFLICT (email) DO NOTHING;

-- Row Level Security policies
-- Only authenticated users can read from admin_users
CREATE POLICY "Enable read access for authenticated users" ON public.admin_users
    FOR SELECT USING (auth.role() = 'authenticated');

-- Only admins can insert/update admin_users (implement based on your needs)
CREATE POLICY "Enable insert for authenticated users" ON public.admin_users
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for users based on id" ON public.admin_users
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Login attempts policies
CREATE POLICY "Enable insert for login attempts" ON public.login_attempts
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable read for authenticated users" ON public.login_attempts
    FOR SELECT USING (auth.role() = 'authenticated');

-- Grant permissions
GRANT ALL ON public.admin_users TO authenticated;
GRANT ALL ON public.login_attempts TO authenticated;
GRANT ALL ON public.admin_users TO anon;
GRANT ALL ON public.login_attempts TO anon;