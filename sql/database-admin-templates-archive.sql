-- Admin Templates Database Schema with Archiving (No Hard Deletes)
-- This schema supports the hierarchical project template structure with soft deletes

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
    archived_at TIMESTAMP WITH TIME ZONE, -- Soft delete timestamp
    archived_by UUID, -- User who archived it
    archive_reason TEXT, -- Optional reason for archiving
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT admin_templates_name_unique UNIQUE (name),
    CONSTRAINT admin_templates_index_positive CHECK (index >= 0)
);

-- Phases table (each template can have multiple phases)
CREATE TABLE template_phases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID NOT NULL REFERENCES admin_templates(id),
    name VARCHAR(255) NOT NULL,
    index INTEGER NOT NULL DEFAULT 0,
    description TEXT,
    archived_at TIMESTAMP WITH TIME ZONE, -- Soft delete timestamp
    archived_by UUID, -- User who archived it
    archive_reason TEXT, -- Optional reason for archiving
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT template_phases_index_positive CHECK (index >= 0)
);

-- Project steps table (supports nested hierarchy)
CREATE TABLE template_steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phase_id UUID NOT NULL REFERENCES template_phases(id),
    parent_step_id UUID REFERENCES template_steps(id), -- For nested steps
    name VARCHAR(255) NOT NULL,
    index INTEGER NOT NULL DEFAULT 0,
    category template_category NOT NULL DEFAULT 'monitor',
    description TEXT,
    metadata JSONB, -- For additional step-specific data
    archived_at TIMESTAMP WITH TIME ZONE, -- Soft delete timestamp
    archived_by UUID, -- User who archived it
    archive_reason TEXT, -- Optional reason for archiving
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT template_steps_index_positive CHECK (index >= 0),
    CONSTRAINT template_steps_name_not_empty CHECK (length(trim(name)) > 0)
);

-- Template versions table (for versioning support)
CREATE TABLE template_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID NOT NULL REFERENCES admin_templates(id),
    version VARCHAR(50) NOT NULL,
    content JSONB NOT NULL, -- Stores the complete template structure
    change_log TEXT,
    archived_at TIMESTAMP WITH TIME ZONE, -- Soft delete timestamp
    archived_by UUID, -- User who archived it
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT template_versions_unique UNIQUE (template_id, version)
);

-- Template sharing table (for collaborative features)
CREATE TABLE template_sharing (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID NOT NULL REFERENCES admin_templates(id),
    shared_with UUID NOT NULL, -- User ID
    permissions JSONB NOT NULL DEFAULT '{"read": true, "write": false, "admin": false}',
    shared_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    archived_at TIMESTAMP WITH TIME ZONE, -- Soft delete timestamp
    archived_by UUID, -- User who archived it
    
    -- Constraints
    CONSTRAINT template_sharing_unique UNIQUE (template_id, shared_with)
);

-- Template usage tracking table
CREATE TABLE template_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID NOT NULL REFERENCES admin_templates(id),
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
CREATE INDEX idx_admin_templates_archived_at ON admin_templates(archived_at) WHERE archived_at IS NOT NULL;
CREATE INDEX idx_admin_templates_active ON admin_templates(id) WHERE archived_at IS NULL;

CREATE INDEX idx_template_phases_template_id ON template_phases(template_id);
CREATE INDEX idx_template_phases_index ON template_phases(index);
CREATE INDEX idx_template_phases_archived_at ON template_phases(archived_at) WHERE archived_at IS NOT NULL;
CREATE INDEX idx_template_phases_active ON template_phases(id) WHERE archived_at IS NULL;

CREATE INDEX idx_template_steps_phase_id ON template_steps(phase_id);
CREATE INDEX idx_template_steps_parent_step_id ON template_steps(parent_step_id);
CREATE INDEX idx_template_steps_category ON template_steps(category);
CREATE INDEX idx_template_steps_index ON template_steps(index);
CREATE INDEX idx_template_steps_archived_at ON template_steps(archived_at) WHERE archived_at IS NOT NULL;
CREATE INDEX idx_template_steps_active ON template_steps(id) WHERE archived_at IS NULL;

CREATE INDEX idx_template_versions_template_id ON template_versions(template_id);
CREATE INDEX idx_template_versions_version ON template_versions(version);
CREATE INDEX idx_template_versions_archived_at ON template_versions(archived_at) WHERE archived_at IS NOT NULL;

CREATE INDEX idx_template_sharing_template_id ON template_sharing(template_id);
CREATE INDEX idx_template_sharing_shared_with ON template_sharing(shared_with);
CREATE INDEX idx_template_sharing_archived_at ON template_sharing(archived_at) WHERE archived_at IS NOT NULL;

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

-- RLS Policies for admin_templates (only show non-archived)
CREATE POLICY "Users can view active public templates" ON admin_templates
    FOR SELECT USING (archived_at IS NULL AND (is_public = true OR status = 'active'));

CREATE POLICY "Users can manage active templates" ON admin_templates
    FOR ALL USING (archived_at IS NULL);

-- RLS Policies for template_phases (only show non-archived)
CREATE POLICY "Users can view active phases" ON template_phases
    FOR SELECT USING (archived_at IS NULL);

CREATE POLICY "Users can manage active phases" ON template_phases
    FOR ALL USING (archived_at IS NULL);

-- RLS Policies for template_steps (only show non-archived)
CREATE POLICY "Users can view active steps" ON template_steps
    FOR SELECT USING (archived_at IS NULL);

CREATE POLICY "Users can manage active steps" ON template_steps
    FOR ALL USING (archived_at IS NULL);

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

-- Function to archive a template and all its related data
CREATE OR REPLACE FUNCTION archive_template(
    template_uuid UUID,
    user_id UUID,
    reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    archive_timestamp TIMESTAMP WITH TIME ZONE := NOW();
BEGIN
    -- Archive all steps first (including nested ones)
    UPDATE template_steps 
    SET 
        archived_at = archive_timestamp,
        archived_by = user_id,
        archive_reason = reason
    WHERE phase_id IN (
        SELECT id FROM template_phases 
        WHERE template_id = template_uuid 
        AND archived_at IS NULL
    )
    AND archived_at IS NULL;
    
    -- Archive all phases
    UPDATE template_phases 
    SET 
        archived_at = archive_timestamp,
        archived_by = user_id,
        archive_reason = reason
    WHERE template_id = template_uuid 
    AND archived_at IS NULL;
    
    -- Archive the template
    UPDATE admin_templates 
    SET 
        archived_at = archive_timestamp,
        archived_by = user_id,
        archive_reason = reason,
        status = 'archived'
    WHERE id = template_uuid 
    AND archived_at IS NULL;
    
    -- Archive sharing permissions
    UPDATE template_sharing 
    SET 
        archived_at = archive_timestamp,
        archived_by = user_id
    WHERE template_id = template_uuid 
    AND archived_at IS NULL;
    
    -- Archive versions
    UPDATE template_versions 
    SET 
        archived_at = archive_timestamp,
        archived_by = user_id
    WHERE template_id = template_uuid 
    AND archived_at IS NULL;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to archive a phase and all its steps
CREATE OR REPLACE FUNCTION archive_phase(
    phase_uuid UUID,
    user_id UUID,
    reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    archive_timestamp TIMESTAMP WITH TIME ZONE := NOW();
BEGIN
    -- Archive all steps in the phase (including nested ones)
    UPDATE template_steps 
    SET 
        archived_at = archive_timestamp,
        archived_by = user_id,
        archive_reason = reason
    WHERE phase_id = phase_uuid 
    AND archived_at IS NULL;
    
    -- Archive the phase
    UPDATE template_phases 
    SET 
        archived_at = archive_timestamp,
        archived_by = user_id,
        archive_reason = reason
    WHERE id = phase_uuid 
    AND archived_at IS NULL;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to archive a step and all its nested steps
CREATE OR REPLACE FUNCTION archive_step(
    step_uuid UUID,
    user_id UUID,
    reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    archive_timestamp TIMESTAMP WITH TIME ZONE := NOW();
BEGIN
    -- Archive all nested steps recursively
    WITH RECURSIVE nested_steps AS (
        SELECT id FROM template_steps WHERE id = step_uuid
        UNION ALL
        SELECT ts.id 
        FROM template_steps ts
        INNER JOIN nested_steps ns ON ts.parent_step_id = ns.id
        WHERE ts.archived_at IS NULL
    )
    UPDATE template_steps 
    SET 
        archived_at = archive_timestamp,
        archived_by = user_id,
        archive_reason = reason
    WHERE id IN (SELECT id FROM nested_steps)
    AND archived_at IS NULL;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to restore archived template
CREATE OR REPLACE FUNCTION restore_template(
    template_uuid UUID,
    user_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Restore the template
    UPDATE admin_templates 
    SET 
        archived_at = NULL,
        archived_by = NULL,
        archive_reason = NULL,
        status = 'active',
        updated_at = NOW()
    WHERE id = template_uuid 
    AND archived_at IS NOT NULL;
    
    -- Restore all phases
    UPDATE template_phases 
    SET 
        archived_at = NULL,
        archived_by = NULL,
        archive_reason = NULL,
        updated_at = NOW()
    WHERE template_id = template_uuid 
    AND archived_at IS NOT NULL;
    
    -- Restore all steps
    UPDATE template_steps 
    SET 
        archived_at = NULL,
        archived_by = NULL,
        archive_reason = NULL,
        updated_at = NOW()
    WHERE phase_id IN (
        SELECT id FROM template_phases 
        WHERE template_id = template_uuid
    )
    AND archived_at IS NOT NULL;
    
    -- Restore sharing permissions
    UPDATE template_sharing 
    SET 
        archived_at = NULL,
        archived_by = NULL
    WHERE template_id = template_uuid 
    AND archived_at IS NOT NULL;
    
    -- Restore versions
    UPDATE template_versions 
    SET 
        archived_at = NULL,
        archived_by = NULL
    WHERE template_id = template_uuid 
    AND archived_at IS NOT NULL;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to get complete template structure (only active items)
CREATE OR REPLACE FUNCTION get_template_structure(template_uuid UUID)
RETURNS JSON AS $$
DECLARE
    template_data JSON;
    phase_data JSON;
    steps_data JSON;
BEGIN
    -- Get template info (only if not archived)
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
    WHERE at.id = template_uuid
    AND at.archived_at IS NULL;

    IF template_data IS NULL THEN
        RETURN NULL;
    END IF;

    -- Get phase info (only active phases)
    SELECT json_agg(
        json_build_object(
            'id', tp.id,
            'name', tp.name,
            'index', tp.index,
            'description', tp.description
        ) ORDER BY tp.index
    ) INTO phase_data
    FROM template_phases tp
    WHERE tp.template_id = template_uuid
    AND tp.archived_at IS NULL;

    -- Get steps recursively (only active steps)
    WITH RECURSIVE step_tree AS (
        -- Base case: top-level steps
        SELECT 
            ts.id,
            ts.name,
            ts.index,
            ts.category,
            ts.description,
            ts.metadata,
            ts.phase_id,
            0 as level,
            ARRAY[ts.index] as path
        FROM template_steps ts
        WHERE ts.phase_id IN (
            SELECT id FROM template_phases 
            WHERE template_id = template_uuid 
            AND archived_at IS NULL
        )
        AND ts.parent_step_id IS NULL
        AND ts.archived_at IS NULL
        
        UNION ALL
        
        -- Recursive case: nested steps
        SELECT 
            ts.id,
            ts.name,
            ts.index,
            ts.category,
            ts.description,
            ts.metadata,
            ts.phase_id,
            st.level + 1,
            st.path || ts.index
        FROM template_steps ts
        JOIN step_tree st ON ts.parent_step_id = st.id
        WHERE ts.archived_at IS NULL
    )
    SELECT json_agg(
        json_build_object(
            'id', st.id,
            'name', st.name,
            'index', st.index,
            'category', st.category,
            'description', st.description,
            'metadata', st.metadata,
            'phase_id', st.phase_id,
            'level', st.level,
            'path', st.path
        ) ORDER BY st.path
    ) INTO steps_data
    FROM step_tree st;

    -- Combine all data
    RETURN json_build_object(
        'template', template_data,
        'phases', COALESCE(phase_data, '[]'::json),
        'steps', COALESCE(steps_data, '[]'::json)
    );
END;
$$ LANGUAGE plpgsql;

-- Function to get archived items for admin review
CREATE OR REPLACE FUNCTION get_archived_templates()
RETURNS JSON AS $$
BEGIN
    RETURN (
        SELECT json_agg(
            json_build_object(
                'id', at.id,
                'name', at.name,
                'description', at.description,
                'archived_at', at.archived_at,
                'archived_by', at.archived_by,
                'archive_reason', at.archive_reason,
                'created_at', at.created_at
            ) ORDER BY at.archived_at DESC
        )
        FROM admin_templates at
        WHERE at.archived_at IS NOT NULL
    );
END;
$$ LANGUAGE plpgsql;
