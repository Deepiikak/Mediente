-- Migration: Add category column to step_tasks table
-- This adds task categorization with predefined types: monitor, coordinate, execute

-- Create enum type for task categories if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_category_type') THEN
        CREATE TYPE task_category_type AS ENUM ('monitor', 'coordinate', 'execute');
        RAISE NOTICE 'Created task_category_type enum';
    ELSE
        RAISE NOTICE 'task_category_type enum already exists';
    END IF;
END $$;

-- Add category column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'step_tasks' 
        AND column_name = 'category'
    ) THEN
        ALTER TABLE step_tasks 
        ADD COLUMN category task_category_type;
        
        RAISE NOTICE 'Added category column to step_tasks table';
    ELSE
        RAISE NOTICE 'category column already exists in step_tasks table';
    END IF;
END $$;

-- Create index for category for better query performance
CREATE INDEX IF NOT EXISTS idx_step_tasks_category ON step_tasks(category);

-- Create composite index for filtering by step and category
CREATE INDEX IF NOT EXISTS idx_step_tasks_step_category ON step_tasks(step_id, category);

-- Add comment to document the category field
COMMENT ON COLUMN step_tasks.category IS 'Task category type: monitor (oversight tasks), coordinate (management/communication tasks), execute (action/implementation tasks)';

RAISE NOTICE 'Task category migration completed successfully';
