-- Performance indexes for user management with large datasets
-- Run these after creating the users table

-- Primary search indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_search_name 
ON public.users USING gin(to_tsvector('english', name));

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_search_email 
ON public.users USING gin(to_tsvector('english', email));

-- Composite index for common filter combinations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_role_dept_status 
ON public.users (role, department, status);

-- Index for pagination ordering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_created_at_desc 
ON public.users (created_at DESC);

-- Index for reporting manager lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_reporting_manager 
ON public.users (reporting_manager) 
WHERE reporting_manager IS NOT NULL;

-- Partial index for active users only (most common queries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_active_name 
ON public.users (name) 
WHERE status = true;

-- Index for department statistics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_dept_active 
ON public.users (department) 
WHERE status = true;

-- Index for role statistics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_role_active 
ON public.users (role) 
WHERE status = true;

-- Index for recent users queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_recent 
ON public.users (created_at) 
WHERE created_at >= (CURRENT_DATE - INTERVAL '30 days');

-- Update statistics for better query planning
ANALYZE public.users;
