-- =====================================================
-- Call Sheet Migration Script
-- Run this to create the call sheet tables and related structures
-- =====================================================

-- Check if tables already exist
DO $$
BEGIN
    -- Only run migration if call_sheets table doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'call_sheets' AND table_schema = 'public') THEN
        RAISE NOTICE 'Creating call sheet tables...';
        
        -- Import the main schema
        \i callsheet-schema.sql
        
        RAISE NOTICE 'Call sheet tables created successfully!';
    ELSE
        RAISE NOTICE 'Call sheet tables already exist. Skipping migration.';
    END IF;
END $$;

-- Alternative approach for direct execution:
-- Uncomment the lines below if the above doesn't work in your environment

/*
-- Enable Row Level Security
ALTER TABLE IF EXISTS public.call_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.call_sheet_time_table ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.call_sheet_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.call_sheet_schedule ENABLE ROW LEVEL SECURITY;

-- Main Call Sheets Table
CREATE TABLE IF NOT EXISTS public.call_sheets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_name TEXT NOT NULL,
    date DATE NOT NULL,
    call_to TEXT NOT NULL,
    time TIME NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'upcoming', 'expired', 'archived')),
    created_by UUID REFERENCES public.admin_users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Time Table Items
CREATE TABLE IF NOT EXISTS public.call_sheet_time_table (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    call_sheet_id UUID NOT NULL REFERENCES public.call_sheets(id) ON DELETE CASCADE,
    item TEXT NOT NULL,
    time TIME NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Locations Table
CREATE TABLE IF NOT EXISTS public.call_sheet_locations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    call_sheet_id UUID NOT NULL REFERENCES public.call_sheets(id) ON DELETE CASCADE,
    location_title TEXT NOT NULL,
    address TEXT NOT NULL,
    link TEXT,
    contact_number TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Schedule/Scenes Table
CREATE TABLE IF NOT EXISTS public.call_sheet_schedule (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    call_sheet_id UUID NOT NULL REFERENCES public.call_sheets(id) ON DELETE CASCADE,
    time TIME NOT NULL,
    scene TEXT NOT NULL,
    description TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_call_sheets_date ON public.call_sheets(date);
CREATE INDEX IF NOT EXISTS idx_call_sheets_status ON public.call_sheets(status);
CREATE INDEX IF NOT EXISTS idx_call_sheets_project_name ON public.call_sheets(project_name);
CREATE INDEX IF NOT EXISTS idx_call_sheets_created_by ON public.call_sheets(created_by);
CREATE INDEX IF NOT EXISTS idx_time_table_call_sheet_id ON public.call_sheet_time_table(call_sheet_id);
CREATE INDEX IF NOT EXISTS idx_time_table_sort_order ON public.call_sheet_time_table(call_sheet_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_locations_call_sheet_id ON public.call_sheet_locations(call_sheet_id);
CREATE INDEX IF NOT EXISTS idx_locations_sort_order ON public.call_sheet_locations(call_sheet_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_schedule_call_sheet_id ON public.call_sheet_schedule(call_sheet_id);
CREATE INDEX IF NOT EXISTS idx_schedule_sort_order ON public.call_sheet_schedule(call_sheet_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_schedule_time ON public.call_sheet_schedule(call_sheet_id, time);

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_call_sheets_updated_at ON public.call_sheets;
CREATE TRIGGER update_call_sheets_updated_at
    BEFORE UPDATE ON public.call_sheets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_time_table_updated_at ON public.call_sheet_time_table;
CREATE TRIGGER update_time_table_updated_at
    BEFORE UPDATE ON public.call_sheet_time_table
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_locations_updated_at ON public.call_sheet_locations;
CREATE TRIGGER update_locations_updated_at
    BEFORE UPDATE ON public.call_sheet_locations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_schedule_updated_at ON public.call_sheet_schedule;
CREATE TRIGGER update_schedule_updated_at
    BEFORE UPDATE ON public.call_sheet_schedule
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
CREATE POLICY "Enable read access for authenticated users" ON public.call_sheets
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable insert for authenticated users" ON public.call_sheets
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users" ON public.call_sheets
    FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Enable delete for authenticated users" ON public.call_sheets
    FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable read access for authenticated users" ON public.call_sheet_time_table
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable insert for authenticated users" ON public.call_sheet_time_table
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users" ON public.call_sheet_time_table
    FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Enable delete for authenticated users" ON public.call_sheet_time_table
    FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable read access for authenticated users" ON public.call_sheet_locations
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable insert for authenticated users" ON public.call_sheet_locations
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users" ON public.call_sheet_locations
    FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Enable delete for authenticated users" ON public.call_sheet_locations
    FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable read access for authenticated users" ON public.call_sheet_schedule
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable insert for authenticated users" ON public.call_sheet_schedule
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users" ON public.call_sheet_schedule
    FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Enable delete for authenticated users" ON public.call_sheet_schedule
    FOR DELETE USING (auth.role() = 'authenticated');

-- Grant permissions
GRANT ALL ON public.call_sheets TO authenticated;
GRANT ALL ON public.call_sheet_time_table TO authenticated;
GRANT ALL ON public.call_sheet_locations TO authenticated;
GRANT ALL ON public.call_sheet_schedule TO authenticated;
GRANT SELECT ON public.call_sheets TO anon;
GRANT SELECT ON public.call_sheet_time_table TO anon;
GRANT SELECT ON public.call_sheet_locations TO anon;
GRANT SELECT ON public.call_sheet_schedule TO anon;

-- Create the complete view
CREATE OR REPLACE VIEW public.call_sheets_complete AS
SELECT 
    cs.*,
    COALESCE(
        json_agg(
            json_build_object(
                'id', tt.id,
                'item', tt.item,
                'time', tt.time,
                'sort_order', tt.sort_order
            ) ORDER BY tt.sort_order, tt.time
        ) FILTER (WHERE tt.id IS NOT NULL), 
        '[]'::json
    ) as time_table,
    COALESCE(
        json_agg(
            json_build_object(
                'id', loc.id,
                'location_title', loc.location_title,
                'address', loc.address,
                'link', loc.link,
                'contact_number', loc.contact_number,
                'sort_order', loc.sort_order
            ) ORDER BY loc.sort_order
        ) FILTER (WHERE loc.id IS NOT NULL), 
        '[]'::json
    ) as locations,
    COALESCE(
        json_agg(
            json_build_object(
                'id', sch.id,
                'time', sch.time,
                'scene', sch.scene,
                'description', sch.description,
                'sort_order', sch.sort_order
            ) ORDER BY sch.sort_order, sch.time
        ) FILTER (WHERE sch.id IS NOT NULL), 
        '[]'::json
    ) as schedule
FROM public.call_sheets cs
LEFT JOIN public.call_sheet_time_table tt ON cs.id = tt.call_sheet_id
LEFT JOIN public.call_sheet_locations loc ON cs.id = loc.call_sheet_id
LEFT JOIN public.call_sheet_schedule sch ON cs.id = sch.call_sheet_id
GROUP BY cs.id, cs.project_name, cs.date, cs.call_to, cs.time, cs.description, cs.status, cs.created_by, cs.created_at, cs.updated_at;
*/
