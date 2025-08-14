-- Debug script to check if phase reordering functions exist
-- Run this in your Supabase SQL editor

-- 1. Check if the reorder_template_phases function exists
SELECT 
    routine_name, 
    routine_type,
    routine_schema
FROM information_schema.routines 
WHERE routine_name = 'reorder_template_phases'
AND routine_schema = 'public';

-- 2. If function doesn't exist, create it quickly
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
    
    -- Verify no duplicate indices within the same template
    IF EXISTS (
        SELECT 1 FROM (
            SELECT template_id, index, COUNT(*) as cnt
            FROM template_phases 
            WHERE archived_at IS NULL
            GROUP BY template_id, index
            HAVING COUNT(*) > 1
        ) duplicates
    ) THEN
        RAISE EXCEPTION 'Duplicate indices detected after reordering phases';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 3. Test the function with dummy data (replace with real UUIDs)
-- SELECT reorder_template_phases('[
--   {"phaseId": "your-phase-id-1", "newIndex": 0},
--   {"phaseId": "your-phase-id-2", "newIndex": 1}
-- ]'::jsonb);

-- 4. Check current phase data to see what we're working with
SELECT 
    id,
    name,
    index,
    template_id,
    created_at,
    updated_at,
    archived_at
FROM template_phases 
WHERE archived_at IS NULL
ORDER BY template_id, index;

-- 5. Grant execute permission
GRANT EXECUTE ON FUNCTION reorder_template_phases(JSONB) TO authenticated;
