-- Admin Templates Database Schema
-- This schema supports the hierarchical project template structure

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types for categories and status
CREATE TYPE template_category AS ENUM ('monitor', 'coordinate', 'execute');
CREATE TYPE template_status AS ENUM ('active', 'inactive', 'archived');

-- Main admin_templates table
CREATE TABLE admin_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    index INTEGER NOT NULL DEFAULT 0,
    description TEXT,
    status template_status NOT NULL DEFAULT 'active',
    is_public BOOLEAN NOT NULL DEFAULT false,
    tags TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT admin_templates_name_unique UNIQUE (name),
    CONSTRAINT admin_templates_index_positive CHECK (index >= 0)
);

-- Phases table (each template has one phase)
CREATE TABLE template_phases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID NOT NULL REFERENCES admin_templates(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    index INTEGER NOT NULL DEFAULT 0,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT template_phases_template_id_unique UNIQUE (template_id),
    CONSTRAINT template_phases_index_positive CHECK (index >= 0)
);

-- Project steps table (supports nested hierarchy)
CREATE TABLE template_steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phase_id UUID NOT NULL REFERENCES template_phases(id) ON DELETE CASCADE,
    parent_step_id UUID REFERENCES template_steps(id) ON DELETE CASCADE, -- For nested steps
    name VARCHAR(255) NOT NULL,
    index INTEGER NOT NULL DEFAULT 0,
    category template_category NOT NULL DEFAULT 'monitor',
    description TEXT,
    metadata JSONB, -- For additional step-specific data
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT template_steps_index_positive CHECK (index >= 0),
    CONSTRAINT template_steps_name_not_empty CHECK (length(trim(name)) > 0)
);

-- Template versions table (for versioning support)
CREATE TABLE template_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID NOT NULL REFERENCES admin_templates(id) ON DELETE CASCADE,
    version VARCHAR(50) NOT NULL,
    content JSONB NOT NULL, -- Stores the complete template structure
    change_log TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT template_versions_unique UNIQUE (template_id, version)
);

-- Template sharing table (for collaborative features)
CREATE TABLE template_sharing (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID NOT NULL REFERENCES admin_templates(id) ON DELETE CASCADE,
    shared_with UUID NOT NULL, -- User ID
    permissions JSONB NOT NULL DEFAULT '{"read": true, "write": false, "admin": false}',
    shared_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT template_sharing_unique UNIQUE (template_id, shared_with)
);

-- Template usage tracking table
CREATE TABLE template_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID NOT NULL REFERENCES admin_templates(id) ON DELETE CASCADE,
    used_by UUID NOT NULL, -- User ID
    project_id UUID, -- Optional project reference
    usage_type VARCHAR(100) NOT NULL, -- e.g., 'viewed', 'copied', 'applied'
    usage_data JSONB, -- Additional usage metadata
    used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX idx_admin_templates_created_at ON admin_templates(created_at DESC);
CREATE INDEX idx_admin_templates_status ON admin_templates(status);
CREATE INDEX idx_admin_templates_is_public ON admin_templates(is_public);

CREATE INDEX idx_template_phases_template_id ON template_phases(template_id);
CREATE INDEX idx_template_phases_index ON template_phases(index);

CREATE INDEX idx_template_steps_phase_id ON template_steps(phase_id);
CREATE INDEX idx_template_steps_parent_step_id ON template_steps(parent_step_id);
CREATE INDEX idx_template_steps_category ON template_steps(category);
CREATE INDEX idx_template_steps_index ON template_steps(index);

CREATE INDEX idx_template_versions_template_id ON template_versions(template_id);
CREATE INDEX idx_template_versions_version ON template_versions(version);

CREATE INDEX idx_template_sharing_template_id ON template_sharing(template_id);
CREATE INDEX idx_template_sharing_shared_with ON template_sharing(shared_with);

CREATE INDEX idx_template_usage_template_id ON template_usage(template_id);
CREATE INDEX idx_template_usage_used_by ON template_usage(used_by);
CREATE INDEX idx_template_usage_used_at ON template_usage(used_at DESC);

-- Row Level Security (RLS) policies
ALTER TABLE admin_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_sharing ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies for admin_templates
CREATE POLICY "Users can view public templates" ON admin_templates
    FOR SELECT USING (is_public = true OR status = 'active');

CREATE POLICY "Users can manage templates" ON admin_templates
    FOR ALL USING (true);

-- RLS Policies for template_phases
CREATE POLICY "Users can view phases" ON template_phases
    FOR SELECT USING (true);

CREATE POLICY "Users can manage phases" ON template_phases
    FOR ALL USING (true);

-- RLS Policies for template_steps
CREATE POLICY "Users can view steps" ON template_steps
    FOR SELECT USING (true);

CREATE POLICY "Users can manage steps" ON template_steps
    FOR ALL USING (true);

-- Functions for common operations
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to automatically update updated_at
CREATE TRIGGER update_admin_templates_updated_at 
    BEFORE UPDATE ON admin_templates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_template_phases_updated_at 
    BEFORE UPDATE ON template_phases 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_template_steps_updated_at 
    BEFORE UPDATE ON template_steps 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to get complete template structure
CREATE OR REPLACE FUNCTION get_template_structure(template_uuid UUID)
RETURNS JSON AS $$
DECLARE
    template_data JSON;
    phase_data JSON;
    steps_data JSON;
BEGIN
    -- Get template info
    SELECT json_build_object(
        'id', at.id,
        'name', at.name,
        'index', at.index,
        'description', at.description,
        'status', at.status,
        'is_public', at.is_public,
        'tags', at.tags,
        'created_at', at.created_at,
        'updated_at', at.updated_at
    ) INTO template_data
    FROM admin_templates at
    WHERE at.id = template_uuid;

    IF template_data IS NULL THEN
        RETURN NULL;
    END IF;

    -- Get phase info
    SELECT json_build_object(
        'id', tp.id,
        'name', tp.name,
        'index', tp.index,
        'description', tp.description
    ) INTO phase_data
    FROM template_phases tp
    WHERE tp.template_id = template_uuid;

    -- Get steps recursively
    WITH RECURSIVE step_tree AS (
        -- Base case: top-level steps
        SELECT 
            ts.id,
            ts.name,
            ts.index,
            ts.category,
            ts.description,
            ts.metadata,
            0 as level,
            ARRAY[ts.index] as path
        FROM template_steps ts
        WHERE ts.phase_id = (SELECT id FROM template_phases WHERE template_id = template_uuid)
        AND ts.parent_step_id IS NULL
        
        UNION ALL
        
        -- Recursive case: nested steps
        SELECT 
            ts.id,
            ts.name,
            ts.index,
            ts.category,
            ts.description,
            ts.metadata,
            st.level + 1,
            st.path || ts.index
        FROM template_steps ts
        JOIN step_tree st ON ts.parent_step_id = st.id
    )
    SELECT json_agg(
        json_build_object(
            'id', st.id,
            'name', st.name,
            'index', st.index,
            'category', st.category,
            'description', st.description,
            'metadata', st.metadata,
            'level', st.level,
            'path', st.path
        ) ORDER BY st.path
    ) INTO steps_data
    FROM step_tree st;

    -- Combine all data
    RETURN json_build_object(
        'template', template_data,
        'phase', phase_data,
        'steps', COALESCE(steps_data, '[]'::json)
    );
END;
$$ LANGUAGE plpgsql;

-- Insert sample data for testing
INSERT INTO admin_templates (name, index, description) VALUES
('Sample Project Template', 0, 'A sample template for demonstration purposes');

-- Insert sample phase
INSERT INTO template_phases (template_id, name, index, description) VALUES
((SELECT id FROM admin_templates WHERE name = 'Sample Project Template'), 'Development Phase', 0, 'Main development phase');

-- Insert sample steps
INSERT INTO template_steps (phase_id, name, index, category, description) VALUES
((SELECT id FROM template_phases WHERE name = 'Development Phase'), 'Planning', 0, 'monitor', 'Project planning step'),
((SELECT id FROM template_phases WHERE name = 'Development Phase'), 'Development', 1, 'execute', 'Actual development work'),
((SELECT id FROM template_phases WHERE name = 'Development Phase'), 'Testing', 2, 'coordinate', 'Quality assurance and testing');

-- Insert nested step
INSERT INTO template_steps (phase_id, parent_step_id, name, index, category, description) VALUES
((SELECT id FROM template_phases WHERE name = 'Development Phase'), 
 (SELECT id FROM template_steps WHERE name = 'Development'), 'Frontend Development', 0, 'execute', 'Frontend implementation'),
((SELECT id FROM template_phases WHERE name = 'Development Phase'), 
 (SELECT id FROM template_steps WHERE name = 'Development'), 'Backend Development', 1, 'execute', 'Backend implementation');
