# 🗃️ Database Setup Guide for Mediente Admin Login

## Step 1: Set Up Environment Variables

Create a `.env` file in your project root:

```bash
# Copy this and fill in your Supabase details
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

> 📍 **Get these from:** Supabase Dashboard → Settings → API

## Step 2: Create Database Tables

1. **Open Supabase SQL Editor:**
   - Go to your Supabase Dashboard
   - Click "SQL Editor" in the left sidebar
   - Click "New query"

2. **Run the Database Schema:**
   ```sql
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

   -- Row Level Security policies
   CREATE POLICY "Enable read access for authenticated users" ON public.admin_users
       FOR SELECT USING (auth.role() = 'authenticated');

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
   ```

3. **Click "Run" to execute the SQL**

## Step 3: Create Admin User in Supabase Auth

### Method 1: Using Supabase Dashboard (Recommended)

1. **Go to Authentication:**
   - Supabase Dashboard → Authentication → Users
   - Click "Add user" button

2. **Create Admin User:**
   ```
   Email: admin@mediente.com
   Password: Admin123!@#
   Auto Confirm User: ✅ (check this)
   ```

3. **Insert Admin Record:**
   - Go back to SQL Editor
   - Run this query to add the admin user to your admin_users table:
   ```sql
   INSERT INTO public.admin_users (email, name, role, is_active) 
   VALUES ('admin@mediente.com', 'System Administrator', 'super_admin', true)
   ON CONFLICT (email) DO NOTHING;
   ```

### Method 2: Using SQL Only

```sql
-- Insert the admin user directly (you'll need to set password via dashboard)
INSERT INTO public.admin_users (email, name, role, is_active) 
VALUES ('admin@mediente.com', 'System Administrator', 'super_admin', true)
ON CONFLICT (email) DO NOTHING;
```

## Step 4: Verify Setup

1. **Check Tables Created:**
   ```sql
   SELECT * FROM admin_users;
   SELECT * FROM login_attempts;
   ```

2. **Check Authentication:**
   - Go to Authentication → Users
   - You should see `admin@mediente.com` listed

## Step 5: Test the Application

1. **Start the app:**
   ```bash
   yarn dev
   ```

2. **Navigate to:** `http://localhost:5173`

3. **Login with:**
   - Email: `admin@mediente.com`
   - Password: `Admin123!@#` (or whatever you set)

## 🔧 Troubleshooting

### Issue: "Admin access only" error
**Solution:** Make sure the user exists in BOTH:
- Supabase Authentication Users
- admin_users table

### Issue: Environment variables not working
**Solution:** 
- Restart the development server after creating `.env`
- Make sure variables start with `VITE_`

### Issue: Database connection error
**Solution:** Check your Supabase URL and API key in `.env`

### Issue: RLS errors
**Solution:** Make sure the policies are created and permissions are granted

## 🔐 Security Notes

1. **Change Default Password:** Always change the default admin password in production
2. **Password Requirements:** 8+ characters, uppercase, lowercase, number, special character
3. **Failed Attempts:** System blocks after 3 failed login attempts
4. **Audit Trail:** All login attempts are logged in the `login_attempts` table

## 📧 Admin User Details

After setup, you'll have:
- **Email:** admin@mediente.com
- **Role:** super_admin
- **Status:** Active
- **Permissions:** Full admin dashboard access

## Next Steps

Once setup is complete:
1. Test login functionality
2. Test password reset
3. Test failed attempt blocking
4. Verify admin dashboard access
5. Add additional admin users as needed