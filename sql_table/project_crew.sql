-- Project Crew table - stores project-specific crew assignments
-- This table maintains the relationship between users and their roles within specific projects
create table public.project_crew (
  project_crew_id uuid not null default gen_random_uuid (),
  project_id uuid not null,
  user_id uuid not null, -- References users.id (global identity)
  role_id uuid not null, -- References department_roles.role_id (project-specific role)
  role_name character varying(100) not null, -- Denormalized for performance
  department_id uuid not null, -- References departments.department_id
  department_name character varying(100) not null, -- Denormalized for performance
  is_lead boolean not null default false, -- Indicates if this person leads this role in the project
  is_active boolean not null default true, -- Active in this project
  joined_date date null default current_date,
  left_date date null,
  notes text null, -- Project-specific notes about this crew member
  created_by character varying(255) not null,
  updated_by character varying(255) null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint project_crew_pkey primary key (project_crew_id),
  constraint project_crew_project_user_role_key unique (project_id, user_id, role_id),
  constraint project_crew_project_id_fkey foreign key (project_id) references projects (project_id) on delete cascade,
  constraint project_crew_user_id_fkey foreign key (user_id) references users (id) on delete cascade,
  constraint project_crew_role_id_fkey foreign key (role_id) references department_roles (role_id) on delete restrict,
  constraint project_crew_department_id_fkey foreign key (department_id) references departments (department_id) on delete restrict,
  constraint project_crew_notes_check check ((char_length(notes) <= 1000)),
  constraint project_crew_dates_check check ((left_date is null or left_date >= joined_date))
) tablespace pg_default;

-- Indexes for performance
create index if not exists idx_project_crew_project_id on public.project_crew using btree (project_id) tablespace pg_default;
create index if not exists idx_project_crew_user_id on public.project_crew using btree (user_id) tablespace pg_default;
create index if not exists idx_project_crew_role_id on public.project_crew using btree (role_id) tablespace pg_default;
create index if not exists idx_project_crew_department_id on public.project_crew using btree (department_id) tablespace pg_default;
create index if not exists idx_project_crew_active on public.project_crew using btree (is_active) tablespace pg_default;
create index if not exists idx_project_crew_lead on public.project_crew using btree (is_lead) tablespace pg_default;
create index if not exists idx_project_crew_project_role on public.project_crew using btree (project_id, role_id) tablespace pg_default;
create index if not exists idx_project_crew_project_user on public.project_crew using btree (project_id, user_id) tablespace pg_default;
create index if not exists idx_project_crew_joined_date on public.project_crew using btree (joined_date) tablespace pg_default;

-- Trigger to update timestamp
create trigger update_project_crew_updated_at before
update on project_crew for each row
execute function update_updated_at_column ();