# User Management Module

## Overview
A production-ready user management system built for handling thousands of users with optimized database queries, pagination, real-time search, and comprehensive audit logging.

## ✅ Production Features Implemented

### Core Functionality
- ✅ **Server-side pagination** - Handles thousands of users efficiently
- ✅ **Real-time search with debouncing** - 500ms delay for optimal performance
- ✅ **Advanced filtering** - By role, department, status with URL state persistence
- ✅ **Bulk operations** - Select and manage multiple users simultaneously
- ✅ **Audit logging** - Complete activity tracking with admin details
- ✅ **Photo upload** - Supabase storage integration with 5MB limits
- ✅ **Database indexes** - Optimized for large datasets and complex queries
- ✅ **Error handling** - Comprehensive error states and user feedback
- ✅ **Loading states** - Proper UX during data fetching
- ✅ **Statistics dashboard** - Real-time user metrics and department breakdown

## Features

### 1. User CRUD Operations
- **Create Users**: Add new team members with detailed profiles
- **View Users**: Browse and search through user listings
- **Update Users**: Edit user information and status
- **Delete Users**: Soft delete (archive) users to maintain data integrity

### 2. User Roles
- **HOD (Head of Department)**: Department leaders with management privileges
- **Associate**: Mid-level team members
- **Crew**: General team members

### 3. Department Management
- Film
- Talent
- Location
- Production
- Camera
- Sound
- Art
- Costume
- Makeup
- Post-Production
- Marketing
- Finance
- HR
- IT

### 4. Advanced Features
- **Photo Upload**: User profile pictures with storage integration
- **Reporting Hierarchy**: Assign reporting managers based on role and department
- **Bulk Operations**: Activate/deactivate multiple users at once
- **Search & Filters**: Find users by name, email, role, department, or status
- **Audit Logging**: Track all user management activities
- **CSV Import/Export**: Bulk user data management

## Database Setup

1. **Create the users table** (if not exists):
```bash
psql -U your_username -d your_database -f sql/users.sql
```

2. **Create the audit_logs table**:
```bash
psql -U your_username -d your_database -f sql/audit_logs.sql
```

3. **Ensure the update_updated_at_column function exists** (usually in database-schema.sql):
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';
```

## Storage Setup for User Photos

1. **Create a storage bucket in Supabase**:
```sql
-- Run this in Supabase SQL Editor
INSERT INTO storage.buckets (id, name, public)
VALUES ('user-photos', 'user-photos', true);
```

2. **Set storage policies**:
```sql
-- Allow authenticated users to upload
CREATE POLICY "Allow authenticated uploads" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'user-photos');

-- Allow public to view photos
CREATE POLICY "Allow public viewing" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'user-photos');
```

## Components Structure

### 1. Main Component
- **AdminUserManagement.tsx**: Main user management interface
  - User listing with pagination
  - Search and filtering
  - Bulk operations
  - Integration with modals

### 2. Form Modal
- **UserFormModal.tsx**: Modal for creating/editing users
  - Form validation
  - Photo upload
  - Department-based manager filtering
  - View/Edit modes

### 3. Services
- **userService.ts**: API service layer
  - CRUD operations
  - Bulk operations
  - Photo upload handling
  - CSV import/export
  - Audit logging

### 4. Types
- **userManagement.ts**: TypeScript interfaces
  - User data structures
  - Filter options
  - Audit log types

## Usage

### Access the Module
Navigate to `/admin/users` in your application

### Create a New User
1. Click "Add User" button
2. Fill in required fields:
   - Name
   - Email
   - Role
   - Department
3. Optional fields:
   - Photo
   - Reporting Manager (auto-filtered by department)
4. Click "Create User"

### Edit Existing User
1. Click "Edit" button on user row
2. Modify desired fields
3. Click "Update User"

### Archive Users
- Single: Click "Archive" on user row
- Multiple: Select users and click "Archive Selected"

### Search and Filter
- Use search bar for name/email lookup
- Filter by role or department
- Filter by active/inactive status

## API Endpoints (via Supabase)

All operations go through Supabase client:

```typescript
// Get all users
await supabase.from('users').select('*')

// Create user
await supabase.from('users').insert(userData)

// Update user
await supabase.from('users').update(userData).eq('id', userId)

// Soft delete (archive)
await supabase.from('users').update({ status: false }).eq('id', userId)
```

## Security Features

1. **Row Level Security (RLS)**: Configured at database level
2. **Audit Logging**: All actions are logged with admin user ID
3. **Soft Deletes**: Users are archived, not permanently deleted
4. **Input Validation**: Client-side and database constraints
5. **Photo Upload Limits**: 5MB max file size, images only

## Performance Optimizations

1. **Database Indexes**:
   - Email (unique)
   - Role
   - Department
   - Status

2. **Pagination**: 10 users per page default
3. **Lazy Loading**: Reporting managers loaded on demand
4. **Optimistic UI Updates**: Immediate feedback on actions

## Troubleshooting

### Common Issues

1. **Photo upload fails**:
   - Check storage bucket exists
   - Verify storage policies
   - Check file size (< 5MB)

2. **Can't see users**:
   - Verify admin authentication
   - Check RLS policies
   - Ensure database connection

3. **Audit logs not saving**:
   - Check audit_logs table exists
   - Verify foreign key constraints
   - Check admin_users table

## Future Enhancements

- [ ] Advanced role permissions
- [ ] Team assignment features
- [ ] Activity timeline per user
- [ ] Email notifications
- [ ] Two-factor authentication
- [ ] API key management
- [ ] User activity reports
- [ ] Skill tracking
- [ ] Availability calendar
