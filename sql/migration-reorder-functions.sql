-- Migration Script: Add Reordering Functions for Templates, Phases, and Steps
-- Version: 1.1.0
-- Date: 2024
-- Description: Adds drag-and-drop reordering functionality with atomic transactions

-- ================================================
-- 1. REORDER TEMPLATE STEPS FUNCTION
-- ================================================

CREATE OR REPLACE FUNCTION reorder_template_steps(
    step_reorders JSONB
)
RETURNS VOID AS $$
DECLARE
    step_reorder JSONB;
    step_id UUID;
    new_index INTEGER;
BEGIN
    -- Loop through each step reorder
    FOR step_reorder IN SELECT * FROM jsonb_array_elements(step_reorders)
    LOOP
        step_id := (step_reorder->>'stepId')::UUID;
        new_index := (step_reorder->>'newIndex')::INTEGER;
        
        -- Update the step's index
        UPDATE template_steps 
        SET 
            index = new_index,
            updated_at = NOW()
        WHERE id = step_id
        AND archived_at IS NULL;
        
        -- Log the reorder operation (optional)
        RAISE NOTICE 'Updated step % to index %', step_id, new_index;
    END LOOP;
    
    -- Verify no duplicate indices within the same parent level
    IF EXISTS (
        SELECT 1 FROM (
            SELECT phase_id, parent_step_id, index, COUNT(*) as cnt
            FROM template_steps 
            WHERE archived_at IS NULL
            GROUP BY phase_id, parent_step_id, index
            HAVING COUNT(*) > 1
        ) duplicates
    ) THEN
        RAISE EXCEPTION 'Duplicate indices detected after reordering steps';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- 2. REORDER TEMPLATE PHASES FUNCTION
-- ================================================

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
        
        -- Log the reorder operation (optional)
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

-- ================================================
-- 3. UTILITY FUNCTIONS FOR REORDERING
-- ================================================

-- Function to normalize indices (remove gaps, ensure 0,1,2,3...)
CREATE OR REPLACE FUNCTION normalize_step_indices(
    target_phase_id UUID,
    target_parent_step_id UUID DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
    step_record RECORD;
    current_index INTEGER := 0;
BEGIN
    -- Select steps in current order and update indices to be sequential
    FOR step_record IN 
        SELECT id FROM template_steps 
        WHERE phase_id = target_phase_id 
        AND (
            (target_parent_step_id IS NULL AND parent_step_id IS NULL) OR
            (parent_step_id = target_parent_step_id)
        )
        AND archived_at IS NULL
        ORDER BY index ASC, created_at ASC
    LOOP
        UPDATE template_steps 
        SET 
            index = current_index,
            updated_at = NOW()
        WHERE id = step_record.id;
        
        current_index := current_index + 1;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to normalize phase indices within a template
CREATE OR REPLACE FUNCTION normalize_phase_indices(
    target_template_id UUID
)
RETURNS VOID AS $$
DECLARE
    phase_record RECORD;
    current_index INTEGER := 0;
BEGIN
    -- Select phases in current order and update indices to be sequential
    FOR phase_record IN 
        SELECT id FROM template_phases 
        WHERE template_id = target_template_id 
        AND archived_at IS NULL
        ORDER BY index ASC, created_at ASC
    LOOP
        UPDATE template_phases 
        SET 
            index = current_index,
            updated_at = NOW()
        WHERE id = phase_record.id;
        
        current_index := current_index + 1;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- 4. VALIDATION FUNCTIONS
-- ================================================

-- Function to validate step ordering within a phase
CREATE OR REPLACE FUNCTION validate_step_ordering(
    target_phase_id UUID
)
RETURNS TABLE(
    level_name TEXT,
    parent_step_name TEXT,
    duplicate_indices INTEGER[],
    gap_after_index INTEGER[]
) AS $$
BEGIN
    -- Check for duplicate indices
    RETURN QUERY
    SELECT 
        'Root Level'::TEXT as level_name,
        ''::TEXT as parent_step_name,
        array_agg(ts.index) as duplicate_indices,
        NULL::INTEGER[] as gap_after_index
    FROM template_steps ts
    WHERE ts.phase_id = target_phase_id 
    AND ts.parent_step_id IS NULL
    AND ts.archived_at IS NULL
    GROUP BY ts.index
    HAVING COUNT(*) > 1;
    
    -- Add more validation logic as needed...
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- 5. MIGRATION DATA FIXES
-- ================================================

-- Fix any existing index gaps or duplicates
DO $$
DECLARE
    template_record RECORD;
    phase_record RECORD;
BEGIN
    -- Normalize all existing template phase indices
    FOR template_record IN 
        SELECT DISTINCT template_id FROM template_phases WHERE archived_at IS NULL
    LOOP
        PERFORM normalize_phase_indices(template_record.template_id);
    END LOOP;
    
    -- Normalize all existing step indices
    FOR phase_record IN 
        SELECT id FROM template_phases WHERE archived_at IS NULL
    LOOP
        -- Normalize root level steps
        PERFORM normalize_step_indices(phase_record.id, NULL);
        
        -- Normalize nested steps (would need recursive logic for deep nesting)
        -- For now, just handle one level of nesting
        FOR template_record IN
            SELECT DISTINCT parent_step_id FROM template_steps 
            WHERE phase_id = phase_record.id 
            AND parent_step_id IS NOT NULL 
            AND archived_at IS NULL
        LOOP
            PERFORM normalize_step_indices(phase_record.id, template_record.parent_step_id::UUID);
        END LOOP;
    END LOOP;
    
    RAISE NOTICE 'Migration completed: All indices normalized';
END;
$$;

-- ================================================
-- 6. GRANTS AND PERMISSIONS
-- ================================================

-- Grant execute permissions to appropriate roles
-- Adjust these based on your application's user roles
GRANT EXECUTE ON FUNCTION reorder_template_steps(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION reorder_template_phases(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION normalize_step_indices(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION normalize_phase_indices(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_step_ordering(UUID) TO authenticated;

-- ================================================
-- 7. EXAMPLE USAGE
-- ================================================

/*
-- Reorder steps example:
SELECT reorder_template_steps('[
  {"stepId": "123e4567-e89b-12d3-a456-426614174000", "newIndex": 0},
  {"stepId": "123e4567-e89b-12d3-a456-426614174001", "newIndex": 1},
  {"stepId": "123e4567-e89b-12d3-a456-426614174002", "newIndex": 2}
]'::jsonb);

-- Reorder phases example:
SELECT reorder_template_phases('[
  {"phaseId": "456e7890-e89b-12d3-a456-426614174000", "newIndex": 0},
  {"phaseId": "456e7890-e89b-12d3-a456-426614174001", "newIndex": 1}
]'::jsonb);

-- Normalize indices for cleanup:
SELECT normalize_phase_indices('789e0123-e89b-12d3-a456-426614174000');
SELECT normalize_step_indices('456e7890-e89b-12d3-a456-426614174000', NULL);

-- Validate ordering:
SELECT * FROM validate_step_ordering('456e7890-e89b-12d3-a456-426614174000');
*/

-- ================================================
-- 8. ROLLBACK SCRIPT (if needed)
-- ================================================

/*
-- To rollback this migration:
DROP FUNCTION IF EXISTS reorder_template_steps(JSONB);
DROP FUNCTION IF EXISTS reorder_template_phases(JSONB);
DROP FUNCTION IF EXISTS normalize_step_indices(UUID, UUID);
DROP FUNCTION IF EXISTS normalize_phase_indices(UUID);
DROP FUNCTION IF EXISTS validate_step_ordering(UUID);
*/
