# Department Management System

This is a complete React-based department management system built with Mantine UI and Supabase.

## Features Implemented

### 1. **AdminDepartmentManagementPage** (`src/pages/admin/AdminDepartments.tsx`)
- Complete department management interface
- Title: "Admin Department Management"
- Add Department button in top right corner
- Search functionality with debounced input
- Tabbed interface for Active/Archived departments
- Pagination support (10 items per page)
- Real-time department count in tabs

### 2. **AdminDepartmentFormModal** (`src/components/AdminDepartmentFormModal.tsx`)
- Modal-based form for creating/editing departments
- Uses Mantine's `Modal` and `@mantine/form`
- Auto-generated department_id (read-only)
- Required department_name field (max 150 chars)
- Optional description field (max 500 chars)
- Archive status display (disabled toggle)
- Auto-filled created_by/updated_by fields
- Form validation with error handling
- Success/error notifications

### 3. **Department Data Model** (`src/types/department.ts`)
- Complete TypeScript type definitions
- Separate form data type for clean form handling

### 4. **Supabase Integration** (`department.sql`)
- Complete SQL schema with proper constraints
- Auto-generated UUIDs for department_id
- Automatic timestamp handling (created_at, updated_at)
- Row Level Security (RLS) policies
- Performance indexes on commonly queried fields

### 5. **Department Service** (`src/services/departmentService.ts`)
- Clean service layer for all CRUD operations
- Pagination and filtering support
- Error handling and type safety
- Reusable methods for all database operations

## Database Schema

```sql
CREATE TABLE departments (
  department_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  department_name VARCHAR(150) NOT NULL,
  description TEXT CHECK (char_length(description) <= 500),
  is_archived BOOLEAN DEFAULT FALSE NOT NULL,
  created_by VARCHAR(255) NOT NULL,
  updated_by VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
```

## Key Features

### 🔍 **Search & Filter**
- Real-time search across department names
- Debounced input for performance
- Works on both active and archived departments

### 📄 **Pagination**
- Server-side pagination with Supabase
- Separate pagination for active/archived tabs
- 10 items per page (configurable)

### 🏷️ **Tabbed Interface**
- **Active Departments**: Shows non-archived departments
- **Archived Departments**: Shows archived departments
- Dynamic count display in tab labels

### ✏️ **CRUD Operations**
- **Create**: Add new departments with validation
- **Read**: Display departments with pagination and search
- **Update**: Edit existing department details
- **Archive/Unarchive**: Toggle department status

### 🔔 **Notifications**
- Success notifications for all operations
- Error handling with user-friendly messages
- Uses Mantine's notification system

### 🎨 **UI/UX Features**
- Modern card-based layout
- Action icons for edit/archive operations
- Loading states and empty state handling
- Responsive design with Mantine components
- Clear visual indicators for archived status

## Usage Instructions

### Setup Database
1. Run the SQL schema in your Supabase database:
   ```bash
   psql -h your-supabase-url -d postgres -f department.sql
   ```

### Import and Use
```tsx
// In your routing or main app component
import { AdminDepartmentManagementPage } from './pages/admin/AdminDepartments';

// Use in your routes
<Route path="/admin/departments" element={<AdminDepartmentManagementPage />} />
```

### Dependencies Required
Make sure you have these Mantine packages installed:
```bash
npm install @mantine/core @mantine/hooks @mantine/form @mantine/notifications
npm install @tabler/icons-react
npm install @supabase/supabase-js
```

## Component Structure

```
src/
├── types/
│   └── department.ts              # Type definitions
├── components/
│   └── AdminDepartmentFormModal.tsx  # Form modal component
├── pages/admin/
│   └── AdminDepartments.tsx       # Main page component
├── services/
│   └── departmentService.ts       # Database service layer
└── supabase.ts                    # Supabase client
```

## Security Features

- Row Level Security (RLS) enabled
- Authenticated user policies
- Auto-filled user tracking (created_by, updated_by)
- Input validation and sanitization
- SQL injection protection via Supabase client

## Performance Optimizations

- Debounced search queries (300ms)
- Server-side pagination
- Optimized database indexes
- React hooks for efficient re-renders
- Separated concerns with service layer

This system provides a complete, production-ready department management solution with all the requested features and best practices implemented.
