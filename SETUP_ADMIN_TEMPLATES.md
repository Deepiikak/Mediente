# Admin Templates Database Setup Guide

This guide will help you set up the database schema for managing admin templates with hierarchical project steps.

## Prerequisites

- PostgreSQL database (version 12 or higher)
- Supabase project (if using Supabase)
- Access to create tables, types, and functions

## Setup Steps

### 1. Run the Database Schema

Execute the SQL commands from `database-admin-templates.sql` in your database:

```bash
# If using psql directly
psql -h your-host -U your-user -d your-database -f database-admin-templates.sql

# If using Supabase SQL editor
# Copy and paste the contents of database-admin-templates.sql
```

### 2. Verify the Setup

After running the schema, you should have the following tables:

- `admin_templates` - Main template information
- `template_phases` - Phase information for each template
- `template_steps` - Project steps with nested hierarchy support
- `template_versions` - Template versioning
- `template_sharing` - Template sharing and permissions
- `template_usage` - Usage tracking

### 3. Check Sample Data

The schema includes sample data. You can verify it's working by running:

```sql
-- Check if templates were created
SELECT * FROM admin_templates;

-- Check if phases were created
SELECT * FROM template_phases;

-- Check if steps were created
SELECT * FROM template_steps;

-- Test the get_template_structure function
SELECT get_template_structure('your-template-uuid');
```

## Database Structure

### Tables Overview

| Table | Purpose | Key Features |
|-------|---------|--------------|
| `admin_templates` | Main template metadata | Name, index, status, visibility |
| `template_phases` | Phase information | One phase per template |
| `template_steps` | Project steps | Hierarchical structure, categories |
| `template_versions` | Version control | Complete template snapshots |
| `template_sharing` | Access control | User permissions, sharing |
| `template_usage` | Analytics | Usage tracking, metrics |

### Key Relationships

```
admin_templates (1) ←→ (1) template_phases
template_phases (1) ←→ (N) template_steps
template_steps (1) ←→ (N) template_steps (self-referencing for nesting)
```

### Categories

The system supports three predefined step categories:
- **monitor** - Blue badge, for monitoring/oversight tasks
- **coordinate** - Green badge, for coordination/planning tasks  
- **execute** - Orange badge, for execution/implementation tasks

## Row Level Security (RLS)

The schema includes RLS policies for:
- **Public access**: Users can view public templates
- **Creator access**: Template creators can manage their templates
- **Admin access**: Admins can manage all templates

### RLS Policies

- Templates are visible if public OR status is active
- All users can manage templates (simplified for demo purposes)
- Steps and phases inherit template access permissions

## Functions

### `get_template_structure(template_uuid)`

Returns a complete JSON representation of a template including:
- Template metadata
- Phase information  
- All steps with nested hierarchy
- Proper ordering by index

### `update_updated_at_column()`

Automatically updates the `updated_at` timestamp when records are modified.

## Indexes

Performance indexes are created for:
- Creation dates (for sorting)
- Status and visibility (for filtering)
- Foreign keys (for joins)
- Search fields (for text search)

## Troubleshooting

### Common Issues

1. **UUID extension not available**
   ```sql
   CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
   ```

2. **Permission denied on table creation**
   - Ensure your user has CREATE TABLE permissions
   - Check if RLS is interfering with operations

3. **Function execution errors**
   - Verify PostgreSQL version compatibility
   - Check function permissions

### Verification Queries

```sql
-- Check table existence
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name LIKE 'template%';

-- Check function existence
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' AND routine_name LIKE 'get_template%';

-- Test sample data
SELECT 
    t.name as template_name,
    p.name as phase_name,
    COUNT(s.id) as step_count
FROM admin_templates t
JOIN template_phases p ON t.id = p.template_id
LEFT JOIN template_steps s ON p.id = s.phase_id
GROUP BY t.id, t.name, p.id, p.name;
```

## Next Steps

After setting up the database:

1. **Update your application** to use the new `templateService.ts`
2. **Test the form** with the `TemplateDemo` page
3. **Configure RLS policies** for your specific user management system
4. **Add any custom indexes** based on your query patterns

## Support

If you encounter issues:
1. Check the PostgreSQL logs for detailed error messages
2. Verify all SQL commands executed successfully
3. Test with the sample data queries above
4. Ensure your database user has sufficient permissions
