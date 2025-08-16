-- Create audit_logs table for tracking user management activities
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  action text NOT NULL,
  admin_user uuid NOT NULL,
  target_user uuid NULL,
  timestamp timestamptz NOT NULL DEFAULT now(),
  ip_address text NULL,
  device_details text NULL,
  details jsonb NULL,
  old_values jsonb NULL,
  new_values jsonb NULL,
  CONSTRAINT audit_logs_pkey PRIMARY KEY (id),
  CONSTRAINT audit_logs_admin_user_fkey FOREIGN KEY (admin_user) REFERENCES admin_users (id),
  CONSTRAINT audit_logs_target_user_fkey FOREIGN KEY (target_user) REFERENCES users (id)
) TABLESPACE pg_default;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_user ON public.audit_logs USING btree (admin_user) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_audit_logs_target_user ON public.audit_logs USING btree (target_user) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.audit_logs USING btree (timestamp DESC) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs USING btree (action) TABLESPACE pg_default;

-- Enable Row Level Security
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Admin users can view all audit logs" ON public.audit_logs
  FOR SELECT
  USING (true);

CREATE POLICY "Admin users can insert audit logs" ON public.audit_logs
  FOR INSERT
  WITH CHECK (true);

-- Grant permissions
GRANT ALL ON TABLE public.audit_logs TO authenticated;
GRANT ALL ON TABLE public.audit_logs TO service_role;
