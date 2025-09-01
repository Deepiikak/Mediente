-- Project Roles table - stores roles extracted from template for each project
-- Now references project_crew for assignments instead of direct user assignment
create table public.project_roles (
  project_role_id uuid not null default gen_random_uuid (),
  project_id uuid not null,
  role_id uuid not null,
  role_name character varying(100) not null,
  department_id uuid not null,
  department_name character varying(100) not null,
  required_count integer not null default 1, -- How many people are needed for this role
  filled_count integer not null default 0, -- How many people are currently assigned
  is_active boolean not null default true,
  created_by character varying(255) not null,
  updated_by character varying(255) null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint project_roles_pkey primary key (project_role_id),
  constraint project_roles_project_id_role_id_key unique (project_id, role_id),
  constraint project_roles_project_id_fkey foreign key (project_id) references projects (project_id) on delete cascade,
  constraint project_roles_role_id_fkey foreign key (role_id) references department_roles (role_id) on delete restrict,
  constraint project_roles_department_id_fkey foreign key (department_id) references departments (department_id) on delete restrict,
  constraint project_roles_required_count_check check ((required_count >= 0)),
  constraint project_roles_filled_count_check check ((filled_count >= 0 and filled_count <= required_count))
) tablespace pg_default;

-- Indexes for performance
create index if not exists idx_project_roles_project_id on public.project_roles using btree (project_id) tablespace pg_default;
create index if not exists idx_project_roles_role_id on public.project_roles using btree (role_id) tablespace pg_default;
create index if not exists idx_project_roles_department_id on public.project_roles using btree (department_id) tablespace pg_default;
create index if not exists idx_project_roles_active on public.project_roles using btree (is_active) tablespace pg_default;
create index if not exists idx_project_roles_required_count on public.project_roles using btree (required_count) tablespace pg_default;
create index if not exists idx_project_roles_filled_count on public.project_roles using btree (filled_count) tablespace pg_default;

-- Trigger to update timestamp
create trigger update_project_roles_updated_at before
update on project_roles for each row
execute function update_updated_at_column ();
