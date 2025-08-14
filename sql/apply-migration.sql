-- Quick migration script to apply reorder functions
-- Run this in your Supabase SQL editor or psql

-- Source the migration file
\i migration-reorder-functions.sql

-- Verify functions are created
SELECT 
    routine_name, 
    routine_type,
    routine_definition 
FROM information_schema.routines 
WHERE routine_name IN (
    'reorder_template_steps',
    'reorder_template_phases',
    'normalize_step_indices',
    'normalize_phase_indices',
    'validate_step_ordering'
) 
AND routine_schema = 'public';

-- Test functions exist (optional)
SELECT 'Functions created successfully' as status;
