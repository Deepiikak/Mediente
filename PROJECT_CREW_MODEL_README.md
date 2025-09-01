# Project-Centric Crew Model

This document describes the enhanced project management system that uses a project-centric crew model, allowing users to have different roles across different projects.

## Overview

The new crew model separates **global identity** (who someone is) from **project context** (what role they play in a specific project). This allows:

- Users to participate in multiple projects simultaneously
- Different roles/departments per project for the same user
- Better flexibility in crew management
- Cleaner separation of concerns

## Architecture Changes

### Database Schema

#### 1. **users** table (Global Identity)
```sql
-- Stores who the person is globally
- id (UUID, Primary Key)
- name, first_name, last_name
- email (unique)
- phone, address
- employment_status ('active', 'inactive', 'terminated', 'on_leave')
- hire_date
- notes (global notes about the person)
- role, department (legacy fields, now nullable)
```

#### 2. **project_crew** table (Project Context)
```sql
-- Stores what role someone plays in a specific project
- project_crew_id (UUID, Primary Key)
- project_id → projects.project_id
- user_id → users.id (global identity)
- role_id → department_roles.role_id (project-specific role)
- role_name, department_id, department_name (denormalized)
- is_lead (team lead for this role in this project)
- is_active (active in this project)
- joined_date, left_date
- notes (project-specific notes)
```

#### 3. **project_roles** table (Updated)
```sql
-- Tracks role requirements and fulfillment
- required_count (how many people needed)
- filled_count (how many currently assigned)
- No longer has assigned_user_id
```

#### 4. **project_tasks** table (Updated)
```sql
-- Tasks now reference project_crew instead of users directly
- assigned_project_crew_id → project_crew.project_crew_id
- No longer has assigned_user_id
```

## Key Features

### 1. **Flexible Role Assignment**
- Same person can be a Director in Project A and a Camera Operator in Project B
- Multiple people can have the same role in a project (e.g., 3 Camera Operators)
- Team leads can be designated per role per project

### 2. **User Lifecycle Management**
- **Adding Existing User**: Search and add existing users to project roles
- **Adding New User**: Create new user and immediately assign to project
- **User Sync**: Global user changes reflect in all their project assignments

### 3. **Project-Specific Context**
- Each crew assignment can have project-specific notes
- Join/leave dates tracked per project
- Lead designation per role per project

### 4. **Task Assignment**
- Tasks automatically assign to crew members when they become "ready"
- Preference given to team leads for task assignment
- Load balancing across multiple crew members in the same role

## Database Functions

### 1. **add_crew_member_to_project()**
- Adds a user to a project in a specific role
- Updates project role filled_count
- Handles role and department denormalization

### 2. **remove_crew_member_from_project()**
- Removes crew member from project
- Unassigns from all related tasks
- Updates filled_count

### 3. **add_or_update_user_for_project()**
- Creates new user or updates existing user info
- Maintains sync between project needs and global user data

### 4. **auto_assign_ready_tasks()**
- Automatically assigns ready tasks to crew members
- Prefers team leads
- Distributes workload across multiple crew members

### 5. **get_project_crew_with_details()**
- Returns crew members with user details and task statistics
- Optimized query for project crew management UI

## API Services

### 1. **projectCrewService**
- `getByProjectIdWithDetails()` - Get all crew with user info and task counts
- `getRolesWithCrew()` - Get roles with their assigned crew members
- `addCrewMember()` - Add existing or new user to project role
- `removeCrewMember()` - Remove crew member from project
- `assignTaskToCrew()` - Assign specific task to crew member
- `getAvailableUsers()` - Get users not yet in the project
- `searchUsers()` - Search for users to add to project

## UI Components

### 1. **ProjectCrewModal**
- **Existing User Tab**: Search and add existing users
- **New User Tab**: Create new user and assign to role
- **Lead Designation**: Mark crew members as team leads
- **Project Notes**: Add project-specific notes
- **Validation**: Comprehensive form validation

### 2. **Updated ProjectDetail**
- **Roles Tab**: Shows roles with crew members in card layout
- **Crew Management**: Add/remove crew members per role
- **Lead Indicators**: Visual indicators for team leads
- **Task Statistics**: Per-crew-member task completion stats

## Migration Process

### 1. **Run Migration**
```sql
\i sql/migration-project-crew-model.sql
```

### 2. **Data Migration**
- Existing user-role assignments migrate to project_crew
- Project roles updated with required/filled counts
- Task assignments updated to reference project_crew

### 3. **Backward Compatibility**
- Legacy interfaces maintained where needed
- Gradual transition supported

## Usage Flow

### 1. **Project Creation**
- Create project from template
- Roles extracted and created with required_count = 1 (default)
- No crew assigned initially

### 2. **Crew Assignment**
- Navigate to project → Roles tab
- Click "Add Crew" for any role
- Choose existing user or create new user
- Assign role-specific context (lead, notes)

### 3. **Task Execution**
- Tasks auto-assign to crew members when ready
- Team leads get preference for task assignment
- Multiple crew members can work on different tasks for same role

### 4. **Crew Management**
- View all crew members per role
- See task completion statistics
- Remove crew members when needed
- Track join/leave dates

## Benefits

### 1. **Flexibility**
- Users can have different roles in different projects
- Multiple people per role supported
- Project-specific context preserved

### 2. **Scalability**
- Supports large projects with many crew members
- Efficient queries with proper indexing
- Separation of global vs project data

### 3. **User Experience**
- Clean, intuitive crew management interface
- Search and add existing users easily
- Create new users on-the-fly
- Clear visual indicators for roles and assignments

### 4. **Data Integrity**
- Proper foreign key relationships
- Constraints prevent invalid assignments
- Audit trail for all crew changes

This new model provides a robust foundation for managing complex film production crews across multiple concurrent projects.
