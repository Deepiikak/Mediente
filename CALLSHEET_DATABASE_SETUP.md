# Call Sheet Database Setup Guide

This guide explains how to set up the database tables for the Call Sheet functionality in the Mediente project.

## Overview

The call sheet system uses a normalized database structure with the following tables:

- `call_sheets` - Main call sheet information
- `call_sheet_time_table` - Daily schedule items
- `call_sheet_locations` - Shooting locations
- `call_sheet_schedule` - Scene schedule details

## Database Schema

### Main Tables

#### `call_sheets`
- Primary table containing basic call sheet information
- Links to admin_users for creator tracking
- Automatic status determination based on date

#### `call_sheet_time_table`
- Stores daily schedule items (breakfast, makeup, etc.)
- Ordered by `sort_order` for display sequence

#### `call_sheet_locations`
- Multiple locations per call sheet
- Includes address, contact info, and map links

#### `call_sheet_schedule`
- Scene-by-scene shooting schedule
- Time-ordered with descriptions

## Setup Instructions

### 1. Run the Migration

Execute the migration script in your Supabase SQL editor:

```sql
-- Option 1: Run the complete schema file
\i sql/callsheet-schema.sql

-- Option 2: Run the migration file
\i sql/migration-callsheet.sql
```

### 2. Verify Tables

Check that all tables were created:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'call_sheet%';
```

You should see:
- `call_sheets`
- `call_sheet_time_table`
- `call_sheet_locations`
- `call_sheet_schedule`

### 3. Test the View

The system includes a view `call_sheets_complete` that joins all related data:

```sql
SELECT * FROM call_sheets_complete LIMIT 1;
```

## Usage in Code

### Service Integration

The `CallSheetService` class provides all CRUD operations:

```typescript
import { callSheetService } from '../services/callSheetService';

// Create a call sheet
const result = await callSheetService.createCallSheet(formData, userId);

// Get call sheets with filters
const callSheets = await callSheetService.getCallSheets(
  { status: 'upcoming' },
  { limit: 10, order_by: 'date' }
);

// Update a call sheet
const updated = await callSheetService.updateCallSheet(id, formData);
```

### Type Safety

All database operations use TypeScript types defined in `src/types/database/callsheet.ts`:

```typescript
import type { CallSheetDB, CallSheetCompleteDB } from '../types/database/callsheet';
```

## Database Features

### Row Level Security (RLS)
- All tables have RLS enabled
- Only authenticated users can access data
- Policies can be customized for specific user roles

### Automatic Timestamps
- `created_at` and `updated_at` fields are managed automatically
- Triggers update `updated_at` on record changes

### Status Management
- Call sheet status is automatically determined based on date:
  - `upcoming` - Future dates
  - `active` - Today's date
  - `expired` - Past dates
  - `draft` - Manual status for incomplete sheets
  - `archived` - Manual status for old sheets

### Cascading Deletes
- Deleting a call sheet automatically removes all related data
- Maintains referential integrity

## Indexes

The schema includes optimized indexes for:
- Date-based queries
- Status filtering
- Project name searches
- User-based filtering
- Relationship lookups

## Sample Queries

### Get Today's Active Call Sheets
```sql
SELECT * FROM call_sheets_complete 
WHERE date = CURRENT_DATE 
ORDER BY time;
```

### Get Upcoming Call Sheets for a Project
```sql
SELECT * FROM call_sheets_complete 
WHERE project_name ILIKE '%project_name%' 
AND status = 'upcoming'
ORDER BY date, time;
```

### Get Call Sheet Statistics
```sql
SELECT 
    status,
    COUNT(*) as count,
    MIN(date) as earliest_date,
    MAX(date) as latest_date
FROM call_sheets 
GROUP BY status;
```

## Troubleshooting

### Common Issues

1. **Foreign Key Constraint Errors**
   - Ensure `admin_users` table exists before creating call sheets
   - The `created_by` field references `admin_users.id`

2. **Permission Errors**
   - Check that RLS policies are properly set
   - Verify user authentication status

3. **Type Mismatches**
   - Ensure date/time formats match expected types
   - Use ISO date strings for date fields
   - Use HH:MM format for time fields

### Debugging Queries

Check table structure:
```sql
\d+ call_sheets
```

View RLS policies:
```sql
\d+ call_sheets;
```

Check constraints:
```sql
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'call_sheets'::regclass;
```

## Migration Notes

- The migration is idempotent - safe to run multiple times
- Existing data is preserved if tables already exist
- The schema supports both PostgreSQL and Supabase environments
- All operations use UUID primary keys for scalability

## Performance Considerations

- Indexes are optimized for common query patterns
- The `call_sheets_complete` view pre-aggregates related data
- Use pagination for large datasets
- Consider partitioning by date for very large datasets

## Security Notes

- All sensitive operations require authentication
- RLS policies prevent unauthorized access
- Consider adding additional policies for role-based access
- Audit logging can be added via triggers if needed
