-- Migration: Add parent_task_id column to step_tasks table for hierarchical tasks
-- This allows tasks to have parent-child relationships within the same step

-- Add parent_task_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'step_tasks' 
        AND column_name = 'parent_task_id'
    ) THEN
        ALTER TABLE step_tasks 
        ADD COLUMN parent_task_id UUID REFERENCES step_tasks(task_id) ON DELETE CASCADE;
        
        RAISE NOTICE 'Added parent_task_id column to step_tasks table';
    ELSE
        RAISE NOTICE 'parent_task_id column already exists in step_tasks table';
    END IF;
END $$;

-- Create index for parent_task_id for better query performance
CREATE INDEX IF NOT EXISTS idx_step_tasks_parent_task_id ON step_tasks(parent_task_id);

-- Create index for hierarchical queries (parent-child relationships)
CREATE INDEX IF NOT EXISTS idx_step_tasks_step_parent ON step_tasks(step_id, parent_task_id);

-- Add constraint to prevent circular parent-child relationships
CREATE OR REPLACE FUNCTION check_task_circular_hierarchy()
RETURNS TRIGGER AS $$
DECLARE
    current_task UUID;
    max_depth INTEGER := 10;
    depth INTEGER := 0;
BEGIN
    -- Only check if parent_task_id is being set
    IF NEW.parent_task_id IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Check if task is trying to be its own parent
    IF NEW.task_id = NEW.parent_task_id THEN
        RAISE EXCEPTION 'Task cannot be its own parent';
    END IF;
    
    -- Check that parent task belongs to the same template (via step hierarchy)
    IF NOT EXISTS (
        SELECT 1 FROM step_tasks st1
        INNER JOIN phase_steps ps1 ON st1.step_id = ps1.step_id
        INNER JOIN template_phases tp1 ON ps1.phase_id = tp1.phase_id
        INNER JOIN step_tasks st2 ON NEW.step_id = st2.step_id
        INNER JOIN phase_steps ps2 ON st2.step_id = ps2.step_id
        INNER JOIN template_phases tp2 ON ps2.phase_id = tp2.phase_id
        WHERE st1.task_id = NEW.parent_task_id 
        AND tp1.template_id = tp2.template_id
    ) THEN
        RAISE EXCEPTION 'Parent task must belong to the same template';
    END IF;
    
    -- Check for circular hierarchy
    current_task := NEW.parent_task_id;
    WHILE current_task IS NOT NULL AND depth < max_depth LOOP
        -- If we find our task in the parent chain, it's circular
        IF current_task = NEW.task_id THEN
            RAISE EXCEPTION 'Circular parent-child relationship detected';
        END IF;
        
        -- Move up the parent chain
        SELECT parent_task_id INTO current_task 
        FROM step_tasks 
        WHERE task_id = current_task;
        
        depth := depth + 1;
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to check circular hierarchy
DROP TRIGGER IF EXISTS check_task_circular_hierarchy_trigger ON step_tasks;
CREATE TRIGGER check_task_circular_hierarchy_trigger
    BEFORE INSERT OR UPDATE ON step_tasks
    FOR EACH ROW
    EXECUTE FUNCTION check_task_circular_hierarchy();

-- Function to get task hierarchy (all descendants of a task)
CREATE OR REPLACE FUNCTION get_task_descendants(task_uuid UUID)
RETURNS TABLE (
    task_id UUID,
    task_name VARCHAR(255),
    parent_task_id UUID,
    level INTEGER
) AS $$
WITH RECURSIVE task_tree AS (
    -- Base case: start with the given task
    SELECT 
        t.task_id,
        t.task_name,
        t.parent_task_id,
        0 as level
    FROM step_tasks t
    WHERE t.task_id = task_uuid
    
    UNION ALL
    
    -- Recursive case: find children
    SELECT 
        t.task_id,
        t.task_name,
        t.parent_task_id,
        tt.level + 1
    FROM step_tasks t
    INNER JOIN task_tree tt ON t.parent_task_id = tt.task_id
)
SELECT * FROM task_tree ORDER BY level, task_name;
$$ LANGUAGE sql;

-- Function to get task ancestors (all parents of a task)
CREATE OR REPLACE FUNCTION get_task_ancestors(task_uuid UUID)
RETURNS TABLE (
    task_id UUID,
    task_name VARCHAR(255),
    parent_task_id UUID,
    level INTEGER
) AS $$
WITH RECURSIVE task_tree AS (
    -- Base case: start with the given task
    SELECT 
        t.task_id,
        t.task_name,
        t.parent_task_id,
        0 as level
    FROM step_tasks t
    WHERE t.task_id = task_uuid
    
    UNION ALL
    
    -- Recursive case: find parents
    SELECT 
        t.task_id,
        t.task_name,
        t.parent_task_id,
        tt.level + 1
    FROM step_tasks t
    INNER JOIN task_tree tt ON t.task_id = tt.parent_task_id
)
SELECT * FROM task_tree ORDER BY level DESC;
$$ LANGUAGE sql;

RAISE NOTICE 'Task hierarchy migration completed successfully';
