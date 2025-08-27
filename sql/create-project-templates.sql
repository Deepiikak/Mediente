-- =====================================================
-- Project Templates Management System for Supabase
-- =====================================================
-- This script creates all tables and functions needed for the project template management system
-- Run this script in your Supabase SQL editor

-- Create update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 1. PROJECT TEMPLATES TABLE (Level 1)
-- =====================================================

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

-- Create indexes for project_templates
CREATE INDEX IF NOT EXISTS idx_project_templates_name ON project_templates(template_name);
CREATE INDEX IF NOT EXISTS idx_project_templates_archived ON project_templates(is_archived);
CREATE INDEX IF NOT EXISTS idx_project_templates_created_at ON project_templates(created_at);
CREATE INDEX IF NOT EXISTS idx_project_templates_created_by ON project_templates(created_by);
-- Full-text search index for template names and descriptions
CREATE INDEX IF NOT EXISTS idx_project_templates_search ON project_templates USING gin(to_tsvector('english', template_name || ' ' || COALESCE(description, '')));

-- Create trigger for project_templates
DROP TRIGGER IF EXISTS update_project_templates_updated_at ON project_templates;
CREATE TRIGGER update_project_templates_updated_at 
    BEFORE UPDATE ON project_templates 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 2. TEMPLATE PHASES TABLE (Level 2)
-- =====================================================

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

-- Create indexes for template_phases
CREATE INDEX IF NOT EXISTS idx_template_phases_template_id ON template_phases(template_id);
CREATE INDEX IF NOT EXISTS idx_template_phases_order ON template_phases(phase_order);
CREATE INDEX IF NOT EXISTS idx_template_phases_archived ON template_phases(is_archived);
CREATE INDEX IF NOT EXISTS idx_template_phases_name ON template_phases(phase_name);
CREATE INDEX IF NOT EXISTS idx_template_phases_template_archived ON template_phases(template_id, is_archived);
-- Full-text search index for phases
CREATE INDEX IF NOT EXISTS idx_template_phases_search ON template_phases USING gin(to_tsvector('english', phase_name || ' ' || COALESCE(description, '')));

-- Create trigger for template_phases
DROP TRIGGER IF EXISTS update_template_phases_updated_at ON template_phases;
CREATE TRIGGER update_template_phases_updated_at 
    BEFORE UPDATE ON template_phases 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 3. PHASE STEPS TABLE (Level 3)
-- =====================================================

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

-- Create indexes for phase_steps
CREATE INDEX IF NOT EXISTS idx_phase_steps_phase_id ON phase_steps(phase_id);
CREATE INDEX IF NOT EXISTS idx_phase_steps_order ON phase_steps(step_order);
CREATE INDEX IF NOT EXISTS idx_phase_steps_archived ON phase_steps(is_archived);
CREATE INDEX IF NOT EXISTS idx_phase_steps_name ON phase_steps(step_name);
CREATE INDEX IF NOT EXISTS idx_phase_steps_phase_archived ON phase_steps(phase_id, is_archived);
-- Full-text search index for steps
CREATE INDEX IF NOT EXISTS idx_phase_steps_search ON phase_steps USING gin(to_tsvector('english', step_name || ' ' || COALESCE(description, '')));

-- Create trigger for phase_steps
DROP TRIGGER IF EXISTS update_phase_steps_updated_at ON phase_steps;
CREATE TRIGGER update_phase_steps_updated_at 
    BEFORE UPDATE ON phase_steps 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 4. STEP TASKS TABLE (Level 4)
-- =====================================================

CREATE TABLE IF NOT EXISTS step_tasks (
  task_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  step_id UUID NOT NULL REFERENCES phase_steps(step_id) ON DELETE CASCADE,
  task_name VARCHAR(200) NOT NULL,
  description TEXT CHECK (char_length(description) <= 1000),
  task_order INTEGER NOT NULL DEFAULT 1,
  estimated_hours INTEGER CHECK (estimated_hours >= 0),
  assigned_role_id UUID REFERENCES department_roles(role_id) ON DELETE SET NULL,
  is_archived BOOLEAN DEFAULT FALSE NOT NULL,
  created_by VARCHAR(255) NOT NULL,
  updated_by VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(step_id, task_order)
);

-- Create indexes for step_tasks
CREATE INDEX IF NOT EXISTS idx_step_tasks_step_id ON step_tasks(step_id);
CREATE INDEX IF NOT EXISTS idx_step_tasks_order ON step_tasks(task_order);
CREATE INDEX IF NOT EXISTS idx_step_tasks_archived ON step_tasks(is_archived);
CREATE INDEX IF NOT EXISTS idx_step_tasks_name ON step_tasks(task_name);
CREATE INDEX IF NOT EXISTS idx_step_tasks_estimated_hours ON step_tasks(estimated_hours);
CREATE INDEX IF NOT EXISTS idx_step_tasks_assigned_role ON step_tasks(assigned_role_id);
CREATE INDEX IF NOT EXISTS idx_step_tasks_step_archived ON step_tasks(step_id, is_archived);
CREATE INDEX IF NOT EXISTS idx_step_tasks_role_archived ON step_tasks(assigned_role_id, is_archived) WHERE assigned_role_id IS NOT NULL;
-- Full-text search index for tasks
CREATE INDEX IF NOT EXISTS idx_step_tasks_search ON step_tasks USING gin(to_tsvector('english', task_name || ' ' || COALESCE(description, '')));

-- Create trigger for step_tasks
DROP TRIGGER IF EXISTS update_step_tasks_updated_at ON step_tasks;
CREATE TRIGGER update_step_tasks_updated_at 
    BEFORE UPDATE ON step_tasks 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE project_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE phase_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE step_tasks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to read project_templates" ON project_templates;
DROP POLICY IF EXISTS "Allow authenticated users to insert project_templates" ON project_templates;
DROP POLICY IF EXISTS "Allow authenticated users to update project_templates" ON project_templates;
DROP POLICY IF EXISTS "Allow authenticated users to delete project_templates" ON project_templates;

DROP POLICY IF EXISTS "Allow authenticated users to read template_phases" ON template_phases;
DROP POLICY IF EXISTS "Allow authenticated users to insert template_phases" ON template_phases;
DROP POLICY IF EXISTS "Allow authenticated users to update template_phases" ON template_phases;
DROP POLICY IF EXISTS "Allow authenticated users to delete template_phases" ON template_phases;

DROP POLICY IF EXISTS "Allow authenticated users to read phase_steps" ON phase_steps;
DROP POLICY IF EXISTS "Allow authenticated users to insert phase_steps" ON phase_steps;
DROP POLICY IF EXISTS "Allow authenticated users to update phase_steps" ON phase_steps;
DROP POLICY IF EXISTS "Allow authenticated users to delete phase_steps" ON phase_steps;

DROP POLICY IF EXISTS "Allow authenticated users to read step_tasks" ON step_tasks;
DROP POLICY IF EXISTS "Allow authenticated users to insert step_tasks" ON step_tasks;
DROP POLICY IF EXISTS "Allow authenticated users to update step_tasks" ON step_tasks;
DROP POLICY IF EXISTS "Allow authenticated users to delete step_tasks" ON step_tasks;

-- Project Templates policies
CREATE POLICY "Allow authenticated users to read project_templates" ON project_templates
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert project_templates" ON project_templates
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update project_templates" ON project_templates
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to delete project_templates" ON project_templates
    FOR DELETE TO authenticated USING (true);

-- Template Phases policies
CREATE POLICY "Allow authenticated users to read template_phases" ON template_phases
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert template_phases" ON template_phases
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update template_phases" ON template_phases
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to delete template_phases" ON template_phases
    FOR DELETE TO authenticated USING (true);

-- Phase Steps policies
CREATE POLICY "Allow authenticated users to read phase_steps" ON phase_steps
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert phase_steps" ON phase_steps
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update phase_steps" ON phase_steps
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to delete phase_steps" ON phase_steps
    FOR DELETE TO authenticated USING (true);

-- Step Tasks policies
CREATE POLICY "Allow authenticated users to read step_tasks" ON step_tasks
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert step_tasks" ON step_tasks
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update step_tasks" ON step_tasks
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to delete step_tasks" ON step_tasks
    FOR DELETE TO authenticated USING (true);

-- =====================================================
-- 6. UTILITY FUNCTIONS
-- =====================================================

-- Function to get template hierarchy with counts and role assignments
CREATE OR REPLACE FUNCTION get_template_hierarchy(template_uuid UUID)
RETURNS TABLE (
    template_id UUID,
    template_name VARCHAR,
    phase_count BIGINT,
    step_count BIGINT,
    task_count BIGINT,
    total_estimated_hours BIGINT,
    roles_involved BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pt.template_id,
        pt.template_name,
        COALESCE(phase_counts.phase_count, 0) as phase_count,
        COALESCE(step_counts.step_count, 0) as step_count,
        COALESCE(task_counts.task_count, 0) as task_count,
        COALESCE(task_hours.total_hours, 0) as total_estimated_hours,
        COALESCE(role_counts.roles_involved, 0) as roles_involved
    FROM project_templates pt
    LEFT JOIN (
        SELECT template_id, COUNT(*) as phase_count
        FROM template_phases
        WHERE is_archived = false
        GROUP BY template_id
    ) phase_counts ON pt.template_id = phase_counts.template_id
    LEFT JOIN (
        SELECT tp.template_id, COUNT(ps.*) as step_count
        FROM template_phases tp
        LEFT JOIN phase_steps ps ON tp.phase_id = ps.phase_id AND ps.is_archived = false
        WHERE tp.is_archived = false
        GROUP BY tp.template_id
    ) step_counts ON pt.template_id = step_counts.template_id
    LEFT JOIN (
        SELECT tp.template_id, COUNT(st.*) as task_count
        FROM template_phases tp
        LEFT JOIN phase_steps ps ON tp.phase_id = ps.phase_id AND ps.is_archived = false
        LEFT JOIN step_tasks st ON ps.step_id = st.step_id AND st.is_archived = false
        WHERE tp.is_archived = false
        GROUP BY tp.template_id
    ) task_counts ON pt.template_id = task_counts.template_id
    LEFT JOIN (
        SELECT tp.template_id, SUM(st.estimated_hours) as total_hours
        FROM template_phases tp
        LEFT JOIN phase_steps ps ON tp.phase_id = ps.phase_id AND ps.is_archived = false
        LEFT JOIN step_tasks st ON ps.step_id = st.step_id AND st.is_archived = false
        WHERE tp.is_archived = false AND st.estimated_hours IS NOT NULL
        GROUP BY tp.template_id
    ) task_hours ON pt.template_id = task_hours.template_id
    LEFT JOIN (
        SELECT tp.template_id, COUNT(DISTINCT st.assigned_role_id) as roles_involved
        FROM template_phases tp
        LEFT JOIN phase_steps ps ON tp.phase_id = ps.phase_id AND ps.is_archived = false
        LEFT JOIN step_tasks st ON ps.step_id = st.step_id AND st.is_archived = false
        WHERE tp.is_archived = false AND st.assigned_role_id IS NOT NULL
        GROUP BY tp.template_id
    ) role_counts ON pt.template_id = role_counts.template_id
    WHERE pt.template_id = template_uuid AND pt.is_archived = false;
END;
$$ LANGUAGE plpgsql;

-- Function to duplicate a template with all its children
CREATE OR REPLACE FUNCTION duplicate_template(
    source_template_id UUID,
    new_template_name VARCHAR,
    created_by_user VARCHAR
)
RETURNS UUID AS $$
DECLARE
    new_template_id UUID;
    phase_record RECORD;
    step_record RECORD;
    task_record RECORD;
    new_phase_id UUID;
    new_step_id UUID;
BEGIN
    -- Create new template
    INSERT INTO project_templates (template_name, description, created_by)
    SELECT new_template_name, description, created_by_user
    FROM project_templates
    WHERE template_id = source_template_id
    RETURNING template_id INTO new_template_id;

    -- Copy phases
    FOR phase_record IN
        SELECT * FROM template_phases
        WHERE template_id = source_template_id AND is_archived = false
        ORDER BY phase_order
    LOOP
        INSERT INTO template_phases (template_id, phase_name, description, phase_order, created_by)
        VALUES (new_template_id, phase_record.phase_name, phase_record.description, phase_record.phase_order, created_by_user)
        RETURNING phase_id INTO new_phase_id;

        -- Copy steps for this phase
        FOR step_record IN
            SELECT * FROM phase_steps
            WHERE phase_id = phase_record.phase_id AND is_archived = false
            ORDER BY step_order
        LOOP
            INSERT INTO phase_steps (phase_id, step_name, description, step_order, created_by)
            VALUES (new_phase_id, step_record.step_name, step_record.description, step_record.step_order, created_by_user)
            RETURNING step_id INTO new_step_id;

            -- Copy tasks for this step (with role assignments)
            FOR task_record IN
                SELECT * FROM step_tasks
                WHERE step_id = step_record.step_id AND is_archived = false
                ORDER BY task_order
            LOOP
                INSERT INTO step_tasks (step_id, task_name, description, task_order, estimated_hours, assigned_role_id, created_by)
                VALUES (new_step_id, task_record.task_name, task_record.description, task_record.task_order, task_record.estimated_hours, task_record.assigned_role_id, created_by_user);
            END LOOP;
        END LOOP;
    END LOOP;

    RETURN new_template_id;
END;
$$ LANGUAGE plpgsql;

-- Function to reorder items within a parent
CREATE OR REPLACE FUNCTION reorder_template_items(
    parent_id UUID,
    item_type VARCHAR,
    item_orders JSON
)
RETURNS BOOLEAN AS $$
DECLARE
    item RECORD;
BEGIN
    -- Loop through the JSON array of item orders
    FOR item IN SELECT * FROM json_array_elements(item_orders)
    LOOP
        CASE item_type
            WHEN 'phases' THEN
                UPDATE template_phases
                SET phase_order = (item.value->>'order')::INTEGER,
                    updated_at = NOW()
                WHERE phase_id = (item.value->>'id')::UUID
                AND template_id = parent_id;
                
            WHEN 'steps' THEN
                UPDATE phase_steps
                SET step_order = (item.value->>'order')::INTEGER,
                    updated_at = NOW()
                WHERE step_id = (item.value->>'id')::UUID
                AND phase_id = parent_id;
                
            WHEN 'tasks' THEN
                UPDATE step_tasks
                SET task_order = (item.value->>'order')::INTEGER,
                    updated_at = NOW()
                WHERE task_id = (item.value->>'id')::UUID
                AND step_id = parent_id;
        END CASE;
    END LOOP;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 7. SAMPLE DATA (OPTIONAL - REMOVE IF NOT NEEDED)
-- =====================================================

-- Insert sample template
DO $$
DECLARE
    sample_template_id UUID;
    sample_phase_id UUID;
    sample_step_id UUID;
BEGIN
    -- Only insert if no templates exist
    IF NOT EXISTS (SELECT 1 FROM project_templates LIMIT 1) THEN
        -- Create sample template
        INSERT INTO project_templates (template_name, description, created_by)
        VALUES ('Film Production Template', 'Complete workflow for film production from pre-production to post-production', 'system')
        RETURNING template_id INTO sample_template_id;

        -- Create sample phases
        INSERT INTO template_phases (template_id, phase_name, description, phase_order, created_by)
        VALUES (sample_template_id, 'Pre-Production', 'Planning and preparation phase', 1, 'system')
        RETURNING phase_id INTO sample_phase_id;

        -- Create sample steps
        INSERT INTO phase_steps (phase_id, step_name, description, step_order, created_by)
        VALUES (sample_phase_id, 'Script Development', 'Develop and finalize the script', 1, 'system')
        RETURNING step_id INTO sample_step_id;

        -- Create sample tasks (Note: assigned_role_id will be NULL since we don't have sample roles)
        INSERT INTO step_tasks (step_id, task_name, description, task_order, estimated_hours, created_by)
        VALUES 
        (sample_step_id, 'First Draft', 'Write the first draft of the script', 1, 40, 'system'),
        (sample_step_id, 'Script Review', 'Review and get feedback on the script', 2, 8, 'system'),
        (sample_step_id, 'Final Draft', 'Complete the final version of the script', 3, 20, 'system');

        -- Add more sample steps
        INSERT INTO phase_steps (phase_id, step_name, description, step_order, created_by)
        VALUES (sample_phase_id, 'Casting', 'Cast actors for the production', 2, 'system')
        RETURNING step_id INTO sample_step_id;

        INSERT INTO step_tasks (step_id, task_name, description, task_order, estimated_hours, created_by)
        VALUES 
        (sample_step_id, 'Casting Call', 'Organize and conduct casting sessions', 1, 16, 'system'),
        (sample_step_id, 'Callback Auditions', 'Conduct callback auditions for shortlisted actors', 2, 8, 'system');

        -- Add Production phase
        INSERT INTO template_phases (template_id, phase_name, description, phase_order, created_by)
        VALUES (sample_template_id, 'Production', 'Filming and recording phase', 2, 'system')
        RETURNING phase_id INTO sample_phase_id;

        INSERT INTO phase_steps (phase_id, step_name, description, step_order, created_by)
        VALUES (sample_phase_id, 'Principal Photography', 'Main filming period', 1, 'system')
        RETURNING step_id INTO sample_step_id;

        INSERT INTO step_tasks (step_id, task_name, description, task_order, estimated_hours, created_by)
        VALUES 
        (sample_step_id, 'Setup Equipment', 'Setup cameras, lighting, and audio equipment', 1, 4, 'system'),
        (sample_step_id, 'Filming', 'Record scenes according to shooting schedule', 2, 80, 'system'),
        (sample_step_id, 'Daily Rushes', 'Review daily footage', 3, 2, 'system');

        -- Add Post-Production phase
        INSERT INTO template_phases (template_id, phase_name, description, phase_order, created_by)
        VALUES (sample_template_id, 'Post-Production', 'Editing and finishing phase', 3, 'system')
        RETURNING phase_id INTO sample_phase_id;

        INSERT INTO phase_steps (phase_id, step_name, description, step_order, created_by)
        VALUES (sample_phase_id, 'Video Editing', 'Edit and assemble the final cut', 1, 'system')
        RETURNING step_id INTO sample_step_id;

        INSERT INTO step_tasks (step_id, task_name, description, task_order, estimated_hours, created_by)
        VALUES 
        (sample_step_id, 'Rough Cut', 'Create initial rough cut of the film', 1, 40, 'system'),
        (sample_step_id, 'Fine Cut', 'Refine the edit with detailed adjustments', 2, 30, 'system'),
        (sample_step_id, 'Final Cut', 'Complete the final version', 3, 20, 'system');
    END IF;
END $$;

-- =====================================================
-- SCRIPT COMPLETED
-- =====================================================

-- Verify tables were created successfully
SELECT 'Project Templates System created successfully!' as status;

-- Show table information
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE tablename IN ('project_templates', 'template_phases', 'phase_steps', 'step_tasks')
ORDER BY tablename;
