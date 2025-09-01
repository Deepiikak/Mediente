# Project Management System

This document describes the role-driven, automated task management system for Mediente.

## Overview

The project management system allows users to:
1. Create projects from templates
2. Automatically extract and create roles from the template
3. Assign crew members to roles
4. Automatically manage task workflow with status transitions

## Architecture

### Database Tables

1. **projects** - Stores project information with JSONB template snapshot
   - Contains the complete task hierarchy snapshot from the template
   - Tracks project status (planning, active, on_hold, completed, cancelled)

2. **project_roles** - Stores roles extracted from the template
   - One entry per unique role in the template
   - Links to department_roles and departments tables
   - Tracks assigned user (initially null)

3. **project_tasks** - Flat structure with denormalized phase/step data
   - All tasks from the template are created as individual records
   - Includes phase_name, step_name, and ordering information
   - Task status: pending → ready → in_progress → completed
   - Links to project_roles for role assignment

### Key Features

1. **Project Creation**
   - When a project is created from a template:
     - Complete template structure is stored as JSONB snapshot
     - All unique roles are extracted and created in project_roles
     - All tasks are created in project_tasks with status 'pending'
     - First task is automatically set to 'ready'

2. **Role Assignment**
   - Roles are pre-created from the template
   - Users can be assigned to roles through the UI
   - When a user is assigned to a role, all 'ready' tasks for that role are auto-assigned

3. **Task Automation**
   - Tasks start as 'pending'
   - When a task completes:
     - If it has child tasks → children become 'ready'
     - If no children → next sequential task becomes 'ready'
   - Tasks automatically assign to the user in the corresponding role when they become 'ready'

4. **Task Hierarchy**
   - Tasks can have parent-child relationships
   - Child tasks only become ready when parent completes
   - Maintains the logical flow from the template

## Database Functions

1. **create_project_from_template()**
   - Creates project with template snapshot
   - Extracts and creates all roles
   - Creates all tasks with proper hierarchy
   - Sets initial task(s) to 'ready'

2. **assign_user_to_project_role()**
   - Assigns a user to a project role
   - Auto-assigns user to all ready tasks for that role

3. **start_project_task()**
   - Changes task status to 'in_progress'
   - Records start time
   - Assigns user if not already assigned

4. **complete_project_task()**
   - Marks task as completed
   - Calculates actual hours
   - Triggers next task(s) to become 'ready'
   - Updates project status if needed

## UI Components

1. **Projects List** (`/admin/projects`)
   - Shows all projects with progress statistics
   - Create new project from template
   - Filter by status, template, etc.

2. **Project Detail** (`/admin/projects/:projectId`)
   - Overview tab: Progress statistics and crew assignment summary
   - Roles tab: Assign/unassign users to roles
   - Tasks tab: View all tasks, start/complete tasks

## Setup Instructions

1. Run the migration to create tables and functions:
   ```sql
   \i sql/migration-project-management.sql
   ```

2. Ensure you have:
   - Templates created with phases, steps, and tasks
   - Department roles defined
   - Users assigned to departments

3. The system is now ready to:
   - Create projects from templates
   - Assign crew members to roles
   - Automatically manage task workflow

## Usage Flow

1. **Create Project**
   - Select a template
   - Enter project details
   - System creates all roles and tasks

2. **Assign Crew**
   - Go to project detail → Roles tab
   - Assign users to each role
   - Tasks auto-assign to users

3. **Execute Tasks**
   - Tasks become 'ready' based on dependencies
   - Users start tasks when ready
   - Complete tasks to trigger next ones

4. **Track Progress**
   - Overview shows real-time progress
   - Tasks automatically flow based on completion
   - Project status updates automatically
