# Quick Setup: Call Sheet Database

## 1. Run the Database Migration

In your Supabase SQL Editor, run:

```sql
-- Copy and paste the contents of sql/callsheet-schema.sql
-- OR run this single command:
\i sql/callsheet-schema.sql
```

## 2. Verify Setup

Check that tables were created:

```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name LIKE 'call_sheet%';
```

Expected output:
- `call_sheets`
- `call_sheet_time_table` 
- `call_sheet_locations`
- `call_sheet_schedule`

## 3. Test the Integration

1. Go to Admin → Call Sheet Management
2. Create a new call sheet
3. Check your Supabase dashboard to see the data

## Environment Variables

Make sure you have these in your `.env` file:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Troubleshooting

**"Failed to load call sheets"**: 
- Check your Supabase credentials
- Verify the database tables exist
- Check the browser console for errors

**"Row Level Security" errors**:
- Make sure you're authenticated in Supabase
- Check RLS policies are correctly set

The system will automatically fall back to demo data if the database is unavailable.
