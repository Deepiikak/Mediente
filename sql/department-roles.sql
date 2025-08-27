-- Create department_roles table
CREATE TABLE department_roles (
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
CREATE INDEX idx_department_roles_department_id ON department_roles(department_id);
CREATE INDEX idx_department_roles_reports_to ON department_roles(reports_to);
CREATE INDEX idx_department_roles_is_archived ON department_roles(is_archived);
CREATE INDEX idx_department_roles_name ON department_roles(role_name);

-- Create trigger to automatically update updated_at timestamp
CREATE TRIGGER update_department_roles_updated_at 
    BEFORE UPDATE ON department_roles 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE department_roles ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Allow authenticated users to read department_roles" ON department_roles
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert department_roles" ON department_roles
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update department_roles" ON department_roles
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to delete department_roles" ON department_roles
    FOR DELETE TO authenticated USING (true);

-- Add constraint to prevent circular reporting relationships
CREATE OR REPLACE FUNCTION check_circular_reporting()
RETURNS TRIGGER AS $$
DECLARE
    current_role UUID;
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
    current_role := NEW.reports_to;
    WHILE current_role IS NOT NULL AND depth < max_depth LOOP
        -- If we find our role in the chain, it's circular
        IF current_role = NEW.role_id THEN
            RAISE EXCEPTION 'Circular reporting relationship detected';
        END IF;
        
        -- Move up the chain
        SELECT reports_to INTO current_role 
        FROM department_roles 
        WHERE role_id = current_role;
        
        depth := depth + 1;
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_circular_reporting_trigger
    BEFORE INSERT OR UPDATE ON department_roles
    FOR EACH ROW
    EXECUTE FUNCTION check_circular_reporting();
