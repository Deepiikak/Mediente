# Mediente Admin Login Setup Guide

## Prerequisites
- Node.js and Yarn installed
- Supabase account and project

## Installation

1. **Install dependencies:**
   ```bash
   yarn install
   ```

2. **Environment Variables:**
   Create a `.env` file in the root directory with:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

## Database Setup

1. **Create Database Tables:**
   - Open your Supabase SQL Editor
   - Copy and run the SQL from `database-schema.sql`
   - This will create `admin_users` and `login_attempts` tables

2. **Create Admin User in Supabase Auth:**
   - Go to Supabase Dashboard > Authentication > Users
   - Click "Invite user" or "Add user"
   - Add user with email: `admin@mediente.com`
   - Set a secure password (must meet the requirements: 8+ chars, uppercase, lowercase, number, special char)

3. **The admin user record will be automatically created in the admin_users table**

## Features Implemented

### ✅ Admin Login Module
- **Secure Authentication:** Email and password login with Supabase Auth
- **Admin-Only Access:** Verifies user exists in admin_users table
- **Password Policy:** Enforces 8+ characters with complexity requirements
- **Failed Attempt Handling:** Blocks after 3 failed attempts
- **Password Reset:** Secure reset with email links (30-min expiry)
- **Security Logging:** Tracks failed login attempts with IP and timestamp
- **Real-time Alerts:** Shows warnings for failed attempts
- **Responsive UI:** Clean, minimal design matching the wireframe

### 🛡️ Security Features
- Row Level Security (RLS) enabled
- HTTPS enforcement
- Session-based authentication
- Secure password hashing via Supabase Auth
- CSRF protection
- Input validation and sanitization

### 🎨 UI/UX Features
- **Mantine UI Components:** Professional, accessible design
- **Form Validation:** Real-time validation with react-hook-form
- **Toast Notifications:** Success/error feedback
- **Loading States:** Clear loading indicators
- **Responsive Design:** Works on all devices
- **Admin Dashboard:** Basic dashboard with navigation

### 🔧 Technical Implementation
- **Component-based Architecture:** Modular, reusable components
- **TypeScript:** Full type safety
- **React Router:** Client-side routing
- **Custom Hooks:** useAuth for state management
- **Service Layer:** Clean separation of API logic
- **Error Handling:** Comprehensive error management

## Development

1. **Start the development server:**
   ```bash
   yarn dev
   ```

2. **Access the application:**
   - Open browser to `http://localhost:5173`
   - You'll be redirected to `/admin/login`

3. **Test the login:**
   - Use the admin credentials you created in Supabase Auth
   - Test failed attempts to see security features
   - Test password reset functionality

## Project Structure

```
src/
├── components/          # Reusable UI components
│   └── ui/             # Basic UI components
├── pages/              # Page-level components
│   └── admin/          # Admin-specific pages
├── services/           # API service layers
├── hooks/              # Custom React hooks
├── types/              # TypeScript type definitions
└── utils/              # Utility functions
```

## Default Admin User
- **Email:** `admin@mediente.com`
- **Role:** `super_admin`
- **Password:** Set via Supabase Auth dashboard

## Security Considerations

1. **Password Requirements:**
   - Minimum 8 characters
   - At least 1 uppercase letter
   - At least 1 lowercase letter
   - At least 1 number
   - At least 1 special character

2. **Login Attempt Limits:**
   - 3 failed attempts trigger account lock
   - Must reset password to regain access
   - All attempts logged with timestamps

3. **Admin Verification:**
   - Users must exist in both Supabase Auth AND admin_users table
   - Only active admin users can access the dashboard

## Next Steps

After successful setup, you can extend the application with:
- User management interface
- Additional admin modules
- Two-factor authentication
- Advanced reporting and analytics
- Role-based permissions
- Audit logging dashboard