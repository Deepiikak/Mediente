-- Migration: Add assigned_role_id column to step_tasks table
-- Run this if you already have an existing step_tasks table without the assigned_role_id column

-- Check if the column exists, and add it if it doesn't
DO $$
BEGIN
    -- Check if the column exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'step_tasks' 
        AND column_name = 'assigned_role_id'
    ) THEN
        -- Add the column
        ALTER TABLE step_tasks 
        ADD COLUMN assigned_role_id UUID REFERENCES department_roles(role_id) ON DELETE SET NULL;
        
        -- Add index for the new column
        CREATE INDEX IF NOT EXISTS idx_step_tasks_assigned_role ON step_tasks(assigned_role_id);
        CREATE INDEX IF NOT EXISTS idx_step_tasks_role_archived ON step_tasks(assigned_role_id, is_archived) WHERE assigned_role_id IS NOT NULL;
        
        RAISE NOTICE 'Added assigned_role_id column to step_tasks table';
    ELSE
        RAISE NOTICE 'assigned_role_id column already exists in step_tasks table';
    END IF;
END $$;
