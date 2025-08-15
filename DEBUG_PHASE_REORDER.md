# 🔍 Debug Phase Reordering Issue

## Issue
Phase reordering works in UI but doesn't save to database.

## Debugging Steps

### 1. Check Console Logs
Open browser DevTools → Console tab and look for these debug messages when dragging phases:

```
🎯 AdminTemplate: Starting phase reorder [array of phase reorders]
🔄 Reordering phases: [array]
📡 Supabase RPC response: {data, error}
```

**Expected Flow:**
- `🎯 AdminTemplate: Starting phase reorder` - Function called
- `🔄 Reordering phases` - Service method called  
- `📡 Supabase RPC response` - Database call made
- `✅ Phase reordering successful` - No errors
- `📋 AdminTemplate: Phase reorder complete` - Reloading template
- `✅ AdminTemplate: State updated successfully` - UI updated

### 2. Check Database Function
Run this in Supabase SQL Editor:

```sql
-- Check if function exists
SELECT 
    routine_name, 
    routine_type,
    routine_schema
FROM information_schema.routines 
WHERE routine_name = 'reorder_template_phases'
AND routine_schema = 'public';
```

**Expected Result:** Should return one row showing the function exists.

### 3. Create Function if Missing
If function doesn't exist, run this in Supabase SQL Editor:

```sql
CREATE OR REPLACE FUNCTION reorder_template_phases(
    phase_reorders JSONB
)
RETURNS VOID AS $$
DECLARE
    phase_reorder JSONB;
    phase_id UUID;
    new_index INTEGER;
BEGIN
    -- Loop through each phase reorder
    FOR phase_reorder IN SELECT * FROM jsonb_array_elements(phase_reorders)
    LOOP
        phase_id := (phase_reorder->>'phaseId')::UUID;
        new_index := (phase_reorder->>'newIndex')::INTEGER;
        
        -- Update the phase's index
        UPDATE template_phases 
        SET 
            index = new_index,
            updated_at = NOW()
        WHERE id = phase_id
        AND archived_at IS NULL;
        
        -- Log the operation
        RAISE NOTICE 'Updated phase % to index %', phase_id, new_index;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION reorder_template_phases(JSONB) TO authenticated;
```

### 4. Check Current Phase Data
Run this to see current phase indices:

```sql
SELECT 
    id,
    name,
    index,
    template_id,
    created_at,
    updated_at
FROM template_phases 
WHERE archived_at IS NULL
ORDER BY template_id, index;
```

### 5. Test Function Manually
Replace UUIDs with real ones from your data:

```sql
SELECT reorder_template_phases('[
  {"phaseId": "your-real-phase-id-1", "newIndex": 0},
  {"phaseId": "your-real-phase-id-2", "newIndex": 1}
]'::jsonb);
```

## Common Issues & Fixes

### Issue 1: Function Doesn't Exist
**Symptom:** Console shows error like "function reorder_template_phases does not exist"
**Fix:** Run the CREATE FUNCTION statement above

### Issue 2: Permission Denied
**Symptom:** Console shows "permission denied for function reorder_template_phases"
**Fix:** Run the GRANT statement above

### Issue 3: Invalid UUIDs
**Symptom:** Console shows "invalid input syntax for type uuid"
**Fix:** Check that phase IDs are valid UUIDs in the reorder array

### Issue 4: Archived Phases
**Symptom:** Reordering works but some phases don't update
**Fix:** Function only updates non-archived phases (archived_at IS NULL)

## Quick Fix Commands

Run these in order in Supabase SQL Editor:

```sql
-- 1. Create the function
CREATE OR REPLACE FUNCTION reorder_template_phases(phase_reorders JSONB)
RETURNS VOID AS $$
DECLARE
    phase_reorder JSONB;
    phase_id UUID;
    new_index INTEGER;
BEGIN
    FOR phase_reorder IN SELECT * FROM jsonb_array_elements(phase_reorders)
    LOOP
        phase_id := (phase_reorder->>'phaseId')::UUID;
        new_index := (phase_reorder->>'newIndex')::INTEGER;
        
        UPDATE template_phases 
        SET index = new_index, updated_at = NOW()
        WHERE id = phase_id AND archived_at IS NULL;
        
        RAISE NOTICE 'Updated phase % to index %', phase_id, new_index;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 2. Grant permissions
GRANT EXECUTE ON FUNCTION reorder_template_phases(JSONB) TO authenticated;

-- 3. Verify it works
SELECT 'Phase reordering function created successfully' as status;
```

## After Fix
1. Refresh your browser
2. Try dragging phases again
3. Check console for success messages
4. Verify indices changed in database
