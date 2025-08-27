-- =====================================================
-- Complete Project Templates Setup Script
-- =====================================================
-- This script ensures all tables, columns, and indexes are properly set up
-- Run this script to create or update your project templates system

-- Step 1: Create update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Create or update project_templates table
CREATE TABLE IF NOT EXISTS project_templates (
  template_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_name VARCHAR(200) NOT NULL,
  description TEXT CHECK (char_length(description) <= 1000),
  is_archived BOOLEAN DEFAULT FALSE NOT NULL,
  created_by VARCHAR(255) NOT NULL,
  updated_by VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Step 3: Create or update template_phases table
CREATE TABLE IF NOT EXISTS template_phases (
  phase_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES project_templates(template_id) ON DELETE CASCADE,
  phase_name VARCHAR(200) NOT NULL,
  description TEXT CHECK (char_length(description) <= 1000),
  phase_order INTEGER NOT NULL DEFAULT 1,
  is_archived BOOLEAN DEFAULT FALSE NOT NULL,
  created_by VARCHAR(255) NOT NULL,
  updated_by VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(template_id, phase_order)
);

-- Step 4: Create or update phase_steps table
CREATE TABLE IF NOT EXISTS phase_steps (
  step_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phase_id UUID NOT NULL REFERENCES template_phases(phase_id) ON DELETE CASCADE,
  step_name VARCHAR(200) NOT NULL,
  description TEXT CHECK (char_length(description) <= 1000),
  step_order INTEGER NOT NULL DEFAULT 1,
  is_archived BOOLEAN DEFAULT FALSE NOT NULL,
  created_by VARCHAR(255) NOT NULL,
  updated_by VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(phase_id, step_order)
);

-- Step 5: Create or update step_tasks table with assigned_role_id
CREATE TABLE IF NOT EXISTS step_tasks (
  task_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  step_id UUID NOT NULL REFERENCES phase_steps(step_id) ON DELETE CASCADE,
  task_name VARCHAR(200) NOT NULL,
  description TEXT CHECK (char_length(description) <= 1000),
  task_order INTEGER NOT NULL DEFAULT 1,
  estimated_hours INTEGER CHECK (estimated_hours >= 0),
  assigned_role_id UUID,
  is_archived BOOLEAN DEFAULT FALSE NOT NULL,
  created_by VARCHAR(255) NOT NULL,
  updated_by VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(step_id, task_order)
);

-- Step 6: Add assigned_role_id column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'step_tasks' 
        AND column_name = 'assigned_role_id'
    ) THEN
        ALTER TABLE step_tasks 
        ADD COLUMN assigned_role_id UUID;
        RAISE NOTICE 'Added assigned_role_id column to step_tasks table';
    END IF;
END $$;

-- Step 7: Add foreign key constraint for assigned_role_id if it doesn't exist
DO $$
BEGIN
    -- Check if the foreign key constraint exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name = 'step_tasks' 
        AND kcu.column_name = 'assigned_role_id'
        AND tc.constraint_type = 'FOREIGN KEY'
    ) THEN
        -- Check if department_roles table exists before adding the constraint
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'department_roles') THEN
            ALTER TABLE step_tasks 
            ADD CONSTRAINT fk_step_tasks_assigned_role 
            FOREIGN KEY (assigned_role_id) REFERENCES department_roles(role_id) ON DELETE SET NULL;
            RAISE NOTICE 'Added foreign key constraint for assigned_role_id';
        ELSE
            RAISE NOTICE 'department_roles table not found. Skipping foreign key constraint.';
        END IF;
    END IF;
END $$;

-- Step 8: Create all necessary indexes
CREATE INDEX IF NOT EXISTS idx_project_templates_name ON project_templates(template_name);
CREATE INDEX IF NOT EXISTS idx_project_templates_archived ON project_templates(is_archived);
CREATE INDEX IF NOT EXISTS idx_project_templates_created_at ON project_templates(created_at);
CREATE INDEX IF NOT EXISTS idx_project_templates_created_by ON project_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_project_templates_search ON project_templates USING gin(to_tsvector('english', template_name || ' ' || COALESCE(description, '')));

CREATE INDEX IF NOT EXISTS idx_template_phases_template_id ON template_phases(template_id);
CREATE INDEX IF NOT EXISTS idx_template_phases_order ON template_phases(phase_order);
CREATE INDEX IF NOT EXISTS idx_template_phases_archived ON template_phases(is_archived);
CREATE INDEX IF NOT EXISTS idx_template_phases_name ON template_phases(phase_name);
CREATE INDEX IF NOT EXISTS idx_template_phases_template_archived ON template_phases(template_id, is_archived);
CREATE INDEX IF NOT EXISTS idx_template_phases_search ON template_phases USING gin(to_tsvector('english', phase_name || ' ' || COALESCE(description, '')));

CREATE INDEX IF NOT EXISTS idx_phase_steps_phase_id ON phase_steps(phase_id);
CREATE INDEX IF NOT EXISTS idx_phase_steps_order ON phase_steps(step_order);
CREATE INDEX IF NOT EXISTS idx_phase_steps_archived ON phase_steps(is_archived);
CREATE INDEX IF NOT EXISTS idx_phase_steps_name ON phase_steps(step_name);
CREATE INDEX IF NOT EXISTS idx_phase_steps_phase_archived ON phase_steps(phase_id, is_archived);
CREATE INDEX IF NOT EXISTS idx_phase_steps_search ON phase_steps USING gin(to_tsvector('english', step_name || ' ' || COALESCE(description, '')));

CREATE INDEX IF NOT EXISTS idx_step_tasks_step_id ON step_tasks(step_id);
CREATE INDEX IF NOT EXISTS idx_step_tasks_order ON step_tasks(task_order);
CREATE INDEX IF NOT EXISTS idx_step_tasks_archived ON step_tasks(is_archived);
CREATE INDEX IF NOT EXISTS idx_step_tasks_name ON step_tasks(task_name);
CREATE INDEX IF NOT EXISTS idx_step_tasks_estimated_hours ON step_tasks(estimated_hours);
CREATE INDEX IF NOT EXISTS idx_step_tasks_assigned_role ON step_tasks(assigned_role_id);
CREATE INDEX IF NOT EXISTS idx_step_tasks_step_archived ON step_tasks(step_id, is_archived);
CREATE INDEX IF NOT EXISTS idx_step_tasks_role_archived ON step_tasks(assigned_role_id, is_archived) WHERE assigned_role_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_step_tasks_search ON step_tasks USING gin(to_tsvector('english', task_name || ' ' || COALESCE(description, '')));

-- Step 9: Create or replace triggers
DROP TRIGGER IF EXISTS update_project_templates_updated_at ON project_templates;
CREATE TRIGGER update_project_templates_updated_at 
    BEFORE UPDATE ON project_templates 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_template_phases_updated_at ON template_phases;
CREATE TRIGGER update_template_phases_updated_at 
    BEFORE UPDATE ON template_phases 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_phase_steps_updated_at ON phase_steps;
CREATE TRIGGER update_phase_steps_updated_at 
    BEFORE UPDATE ON phase_steps 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_step_tasks_updated_at ON step_tasks;
CREATE TRIGGER update_step_tasks_updated_at 
    BEFORE UPDATE ON step_tasks 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Step 10: Enable Row Level Security
ALTER TABLE project_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE phase_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE step_tasks ENABLE ROW LEVEL SECURITY;

-- Step 11: Create RLS policies (drop existing first to avoid conflicts)
DROP POLICY IF EXISTS "Allow authenticated users to read project_templates" ON project_templates;
DROP POLICY IF EXISTS "Allow authenticated users to insert project_templates" ON project_templates;
DROP POLICY IF EXISTS "Allow authenticated users to update project_templates" ON project_templates;
DROP POLICY IF EXISTS "Allow authenticated users to delete project_templates" ON project_templates;

CREATE POLICY "Allow authenticated users to read project_templates" ON project_templates
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to insert project_templates" ON project_templates
    FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated users to update project_templates" ON project_templates
    FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to delete project_templates" ON project_templates
    FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to read template_phases" ON template_phases;
DROP POLICY IF EXISTS "Allow authenticated users to insert template_phases" ON template_phases;
DROP POLICY IF EXISTS "Allow authenticated users to update template_phases" ON template_phases;
DROP POLICY IF EXISTS "Allow authenticated users to delete template_phases" ON template_phases;

CREATE POLICY "Allow authenticated users to read template_phases" ON template_phases
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to insert template_phases" ON template_phases
    FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated users to update template_phases" ON template_phases
    FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to delete template_phases" ON template_phases
    FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to read phase_steps" ON phase_steps;
DROP POLICY IF EXISTS "Allow authenticated users to insert phase_steps" ON phase_steps;
DROP POLICY IF EXISTS "Allow authenticated users to update phase_steps" ON phase_steps;
DROP POLICY IF EXISTS "Allow authenticated users to delete phase_steps" ON phase_steps;

CREATE POLICY "Allow authenticated users to read phase_steps" ON phase_steps
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to insert phase_steps" ON phase_steps
    FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated users to update phase_steps" ON phase_steps
    FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to delete phase_steps" ON phase_steps
    FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to read step_tasks" ON step_tasks;
DROP POLICY IF EXISTS "Allow authenticated users to insert step_tasks" ON step_tasks;
DROP POLICY IF EXISTS "Allow authenticated users to update step_tasks" ON step_tasks;
DROP POLICY IF EXISTS "Allow authenticated users to delete step_tasks" ON step_tasks;

CREATE POLICY "Allow authenticated users to read step_tasks" ON step_tasks
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to insert step_tasks" ON step_tasks
    FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated users to update step_tasks" ON step_tasks
    FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to delete step_tasks" ON step_tasks
    FOR DELETE TO authenticated USING (true);

-- Step 12: Verification
DO $$
BEGIN
    -- Check if all tables exist
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'project_templates') AND
       EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'template_phases') AND
       EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'phase_steps') AND
       EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'step_tasks') THEN
        RAISE NOTICE 'All project template tables created successfully!';
    ELSE
        RAISE NOTICE 'Some tables may not have been created properly.';
    END IF;
    
    -- Check if assigned_role_id column exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'step_tasks' 
        AND column_name = 'assigned_role_id'
    ) THEN
        RAISE NOTICE 'assigned_role_id column exists in step_tasks table.';
    ELSE
        RAISE NOTICE 'WARNING: assigned_role_id column not found in step_tasks table.';
    END IF;
END $$;

-- Final success message
SELECT 'Project Templates System setup completed successfully!' as status;
