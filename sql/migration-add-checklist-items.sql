-- Migration: Add checklist_items JSONB column to step_tasks table
-- This allows tasks to contain ordered checklist items stored as JSON

-- Add checklist_items column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'step_tasks' 
        AND column_name = 'checklist_items'
    ) THEN
        ALTER TABLE step_tasks 
        ADD COLUMN checklist_items JSONB DEFAULT '[]'::jsonb;
        
        RAISE NOTICE 'Added checklist_items column to step_tasks table';
    ELSE
        RAISE NOTICE 'checklist_items column already exists in step_tasks table';
    END IF;
END $$;

-- Create GIN index for JSONB operations for better query performance
CREATE INDEX IF NOT EXISTS idx_step_tasks_checklist_items ON step_tasks USING GIN (checklist_items);

-- Add constraint to ensure checklist_items is a valid JSON array
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'step_tasks_checklist_items_is_array'
    ) THEN
        ALTER TABLE step_tasks 
        ADD CONSTRAINT step_tasks_checklist_items_is_array 
        CHECK (jsonb_typeof(checklist_items) = 'array');
        
        RAISE NOTICE 'Added constraint to ensure checklist_items is a JSON array';
    ELSE
        RAISE NOTICE 'checklist_items array constraint already exists';
    END IF;
END $$;

-- Add comment to document the checklist_items field structure
COMMENT ON COLUMN step_tasks.checklist_items IS 'JSONB array of checklist items with structure: [{"id": "uuid", "text": "string", "order": number}]';

-- Function to validate checklist item structure
CREATE OR REPLACE FUNCTION validate_checklist_item(item JSONB)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if item has required fields with correct types
    RETURN (
        item ? 'id' AND 
        item ? 'text' AND 
        item ? 'order' AND
        jsonb_typeof(item->'id') = 'string' AND
        jsonb_typeof(item->'text') = 'string' AND
        jsonb_typeof(item->'order') = 'number'
    );
END;
$$ LANGUAGE plpgsql;

-- Function to validate entire checklist_items array
CREATE OR REPLACE FUNCTION validate_checklist_items_array(items JSONB)
RETURNS BOOLEAN AS $$
DECLARE
    item JSONB;
BEGIN
    -- Check if it's an array
    IF jsonb_typeof(items) != 'array' THEN
        RETURN FALSE;
    END IF;
    
    -- Validate each item in the array
    FOR item IN SELECT jsonb_array_elements(items) LOOP
        IF NOT validate_checklist_item(item) THEN
            RETURN FALSE;
        END IF;
    END LOOP;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Add constraint to validate checklist items structure
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'step_tasks_checklist_items_valid_structure'
    ) THEN
        ALTER TABLE step_tasks 
        ADD CONSTRAINT step_tasks_checklist_items_valid_structure 
        CHECK (validate_checklist_items_array(checklist_items));
        
        RAISE NOTICE 'Added constraint to validate checklist_items structure';
    ELSE
        RAISE NOTICE 'checklist_items structure validation constraint already exists';
    END IF;
END $$;

RAISE NOTICE 'Checklist items migration completed successfully';
