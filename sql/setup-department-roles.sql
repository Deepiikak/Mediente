-- Setup Department Roles Module for Supabase
-- This file creates the department_roles table with hierarchical relationships
-- Run this after setting up the departments table

-- Create department_roles table
CREATE TABLE IF NOT EXISTS department_roles (
  role_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  role_name VARCHAR(150) NOT NULL,
  description TEXT CHECK (char_length(description) <= 500),
  department_id UUID NOT NULL REFERENCES departments(department_id) ON DELETE CASCADE,
  reports_to UUID REFERENCES department_roles(role_id) ON DELETE SET NULL,
  is_archived BOOLEAN DEFAULT FALSE NOT NULL,
  created_by VARCHAR(255) NOT NULL,
  updated_by VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_department_roles_department_id ON department_roles(department_id);
CREATE INDEX IF NOT EXISTS idx_department_roles_reports_to ON department_roles(reports_to);
CREATE INDEX IF NOT EXISTS idx_department_roles_is_archived ON department_roles(is_archived);
CREATE INDEX IF NOT EXISTS idx_department_roles_name ON department_roles(role_name);

-- Create or replace the update timestamp function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at timestamp
DROP TRIGGER IF EXISTS update_department_roles_updated_at ON department_roles;
CREATE TRIGGER update_department_roles_updated_at 
    BEFORE UPDATE ON department_roles 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE department_roles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to read department_roles" ON department_roles;
DROP POLICY IF EXISTS "Allow authenticated users to insert department_roles" ON department_roles;
DROP POLICY IF EXISTS "Allow authenticated users to update department_roles" ON department_roles;
DROP POLICY IF EXISTS "Allow authenticated users to delete department_roles" ON department_roles;

-- Create policies for authenticated users
CREATE POLICY "Allow authenticated users to read department_roles" ON department_roles
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert department_roles" ON department_roles
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update department_roles" ON department_roles
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to delete department_roles" ON department_roles
    FOR DELETE TO authenticated USING (true);

-- Create or replace function to check circular reporting relationships
CREATE OR REPLACE FUNCTION check_circular_reporting()
RETURNS TRIGGER AS $$
DECLARE
    current_role_id UUID;
    max_depth INTEGER := 10;
    depth INTEGER := 0;
BEGIN
    -- Only check if reports_to is being set
    IF NEW.reports_to IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Check if role is trying to report to itself
    IF NEW.role_id = NEW.reports_to THEN
        RAISE EXCEPTION 'Role cannot report to itself';
    END IF;
    
    -- Check for circular reporting chain
    current_role_id := NEW.reports_to;
    WHILE current_role_id IS NOT NULL AND depth < max_depth LOOP
        -- If we find our role in the chain, it's circular
        IF current_role_id = NEW.role_id THEN
            RAISE EXCEPTION 'Circular reporting relationship detected';
        END IF;
        
        -- Move up the chain
        SELECT reports_to INTO current_role_id 
        FROM department_roles 
        WHERE role_id = current_role_id;
        
        depth := depth + 1;
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS check_circular_reporting_trigger ON department_roles;

-- Create trigger to prevent circular reporting relationships
CREATE TRIGGER check_circular_reporting_trigger
    BEFORE INSERT OR UPDATE ON department_roles
    FOR EACH ROW
    EXECUTE FUNCTION check_circular_reporting();

-- Insert some sample roles for testing (optional - remove if not needed)
-- Production Department roles
INSERT INTO department_roles (role_name, description, department_id, reports_to, created_by, updated_by) 
SELECT 
    'Production Manager',
    'Oversees all production activities and manages department heads',
    d.department_id,
    NULL,
    'system@mediente.com',
    'system@mediente.com'
FROM departments d 
WHERE d.department_name = 'Production' AND d.is_archived = false
ON CONFLICT DO NOTHING;

INSERT INTO department_roles (role_name, description, department_id, reports_to, created_by, updated_by) 
SELECT 
    'Assistant Director',
    'Assists production manager and coordinates daily operations',
    d.department_id,
    pm.role_id,
    'system@mediente.com',
    'system@mediente.com'
FROM departments d 
CROSS JOIN department_roles pm
WHERE d.department_name = 'Production' 
    AND d.is_archived = false 
    AND pm.role_name = 'Production Manager'
    AND pm.department_id = d.department_id
ON CONFLICT DO NOTHING;

-- Camera Department roles
INSERT INTO department_roles (role_name, description, department_id, reports_to, created_by, updated_by) 
SELECT 
    'Director of Photography',
    'Head of camera department, responsible for visual storytelling',
    d.department_id,
    NULL,
    'system@mediente.com',
    'system@mediente.com'
FROM departments d 
WHERE d.department_name = 'Camera' AND d.is_archived = false
ON CONFLICT DO NOTHING;

INSERT INTO department_roles (role_name, description, department_id, reports_to, created_by, updated_by) 
SELECT 
    'Camera Operator',
    'Operates camera equipment under DP supervision',
    d.department_id,
    dp.role_id,
    'system@mediente.com',
    'system@mediente.com'
FROM departments d 
CROSS JOIN department_roles dp
WHERE d.department_name = 'Camera' 
    AND d.is_archived = false 
    AND dp.role_name = 'Director of Photography'
    AND dp.department_id = d.department_id
ON CONFLICT DO NOTHING;

-- Sound Department roles
INSERT INTO department_roles (role_name, description, department_id, reports_to, created_by, updated_by) 
SELECT 
    'Sound Mixer',
    'Head of sound department, manages audio recording',
    d.department_id,
    NULL,
    'system@mediente.com',
    'system@mediente.com'
FROM departments d 
WHERE d.department_name = 'Sound' AND d.is_archived = false
ON CONFLICT DO NOTHING;

INSERT INTO department_roles (role_name, description, department_id, reports_to, created_by, updated_by) 
SELECT 
    'Boom Operator',
    'Operates boom microphone and assists sound mixer',
    d.department_id,
    sm.role_id,
    'system@mediente.com',
    'system@mediente.com'
FROM departments d 
CROSS JOIN department_roles sm
WHERE d.department_name = 'Sound' 
    AND d.is_archived = false 
    AND sm.role_name = 'Sound Mixer'
    AND sm.department_id = d.department_id
ON CONFLICT DO NOTHING;

-- Makeup Department roles
INSERT INTO department_roles (role_name, description, department_id, reports_to, created_by, updated_by) 
SELECT 
    'Makeup Department Head',
    'Leads makeup team and designs character looks',
    d.department_id,
    NULL,
    'system@mediente.com',
    'system@mediente.com'
FROM departments d 
WHERE d.department_name = 'Makeup' AND d.is_archived = false
ON CONFLICT DO NOTHING;

INSERT INTO department_roles (role_name, description, department_id, reports_to, created_by, updated_by) 
SELECT 
    'Makeup Artist',
    'Applies makeup and maintains continuity',
    d.department_id,
    mdh.role_id,
    'system@mediente.com',
    'system@mediente.com'
FROM departments d 
CROSS JOIN department_roles mdh
WHERE d.department_name = 'Makeup' 
    AND d.is_archived = false 
    AND mdh.role_name = 'Makeup Department Head'
    AND mdh.department_id = d.department_id
ON CONFLICT DO NOTHING;
