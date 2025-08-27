-- Create project templates schema

-- Templates table (top level)
CREATE TABLE project_templates (
  template_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_name VARCHAR(200) NOT NULL,
  description TEXT CHECK (char_length(description) <= 1000),
  is_archived BOOLEAN DEFAULT FALSE NOT NULL,
  created_by VARCHAR(255) NOT NULL,
  updated_by VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Phases table (second level)
CREATE TABLE template_phases (
  phase_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES project_templates(template_id) ON DELETE CASCADE,
  phase_name VARCHAR(200) NOT NULL,
  description TEXT CHECK (char_length(description) <= 1000),
  phase_order INTEGER NOT NULL DEFAULT 1,
  is_archived BOOLEAN DEFAULT FALSE NOT NULL,
  created_by VARCHAR(255) NOT NULL,
  updated_by VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Steps table (third level)
CREATE TABLE phase_steps (
  step_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phase_id UUID NOT NULL REFERENCES template_phases(phase_id) ON DELETE CASCADE,
  step_name VARCHAR(200) NOT NULL,
  description TEXT CHECK (char_length(description) <= 1000),
  step_order INTEGER NOT NULL DEFAULT 1,
  is_archived BOOLEAN DEFAULT FALSE NOT NULL,
  created_by VARCHAR(255) NOT NULL,
  updated_by VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Tasks table (fourth level)
CREATE TABLE step_tasks (
  task_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  step_id UUID NOT NULL REFERENCES phase_steps(step_id) ON DELETE CASCADE,
  task_name VARCHAR(200) NOT NULL,
  description TEXT CHECK (char_length(description) <= 1000),
  task_order INTEGER NOT NULL DEFAULT 1,
  estimated_hours INTEGER,
  is_archived BOOLEAN DEFAULT FALSE NOT NULL,
  created_by VARCHAR(255) NOT NULL,
  updated_by VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes for performance
CREATE INDEX idx_template_phases_template_id ON template_phases(template_id);
CREATE INDEX idx_template_phases_order ON template_phases(phase_order);
CREATE INDEX idx_phase_steps_phase_id ON phase_steps(phase_id);
CREATE INDEX idx_phase_steps_order ON phase_steps(step_order);
CREATE INDEX idx_step_tasks_step_id ON step_tasks(step_id);
CREATE INDEX idx_step_tasks_order ON step_tasks(task_order);

-- Create triggers to automatically update updated_at timestamp
CREATE TRIGGER update_project_templates_updated_at 
    BEFORE UPDATE ON project_templates 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_template_phases_updated_at 
    BEFORE UPDATE ON template_phases 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_phase_steps_updated_at 
    BEFORE UPDATE ON phase_steps 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_step_tasks_updated_at 
    BEFORE UPDATE ON step_tasks 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE project_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE phase_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE step_tasks ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
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
