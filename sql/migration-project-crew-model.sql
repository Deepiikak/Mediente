-- Migration: Project-Centric Crew Model
-- This migration transitions from direct user-role assignment to project-specific crew assignments

-- Step 1: Backup existing data
create table if not exists project_roles_backup as select * from project_roles;
create table if not exists project_tasks_backup as select * from project_tasks;

-- Step 2: Modify users table to remove role/department constraints
alter table public.users drop constraint if exists users_role_check;
alter table public.users 
  alter column role drop not null,
  alter column department drop not null;

-- Add new columns for better global identity management
alter table public.users 
  add column if not exists first_name character varying(100),
  add column if not exists last_name character varying(100),
  add column if not exists phone character varying(20),
  add column if not exists emergency_contact_name character varying(100),
  add column if not exists emergency_contact_phone character varying(20),
  add column if not exists address text,
  add column if not exists notes text,
  add column if not exists hire_date date,
  add column if not exists employment_status character varying(50) default 'active';

-- Add constraints for new fields
alter table public.users 
  add constraint if not exists users_phone_check check ((char_length(phone) >= 10)),
  add constraint if not exists users_address_check check ((char_length(address) <= 500)),
  add constraint if not exists users_notes_check check ((char_length(notes) <= 1000)),
  add constraint if not exists users_employment_status_check check (
    employment_status in ('active', 'inactive', 'terminated', 'on_leave')
  );

-- Step 3: Create project_crew table
create table if not exists public.project_crew (
  project_crew_id uuid not null default gen_random_uuid (),
  project_id uuid not null,
  user_id uuid not null,
  role_id uuid not null,
  role_name character varying(100) not null,
  department_id uuid not null,
  department_name character varying(100) not null,
  is_lead boolean not null default false,
  is_active boolean not null default true,
  joined_date date null default current_date,
  left_date date null,
  notes text null,
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

-- Step 4: Migrate existing assignments to project_crew
insert into project_crew (
  project_id,
  user_id,
  role_id,
  role_name,
  department_id,
  department_name,
  created_by
)
select 
  pr.project_id,
  pr.assigned_user_id,
  pr.role_id,
  pr.role_name,
  pr.department_id,
  pr.department_name,
  pr.created_by
from project_roles_backup pr
where pr.assigned_user_id is not null
on conflict (project_id, user_id, role_id) do nothing;

-- Step 5: Drop old columns and add new ones to project_roles
alter table project_roles 
  drop column if exists assigned_user_id,
  add column if not exists required_count integer not null default 1,
  add column if not exists filled_count integer not null default 0;

-- Update filled_count based on current crew assignments
update project_roles pr
set filled_count = (
  select count(*)
  from project_crew pc
  where pc.project_id = pr.project_id
  and pc.role_id = pr.role_id
  and pc.is_active = true
);

-- Step 6: Update project_tasks table
alter table project_tasks 
  drop column if exists assigned_user_id,
  add column if not exists assigned_project_crew_id uuid;

-- Add foreign key constraint for project_crew
alter table project_tasks
  add constraint if not exists project_tasks_assigned_project_crew_id_fkey 
  foreign key (assigned_project_crew_id) references project_crew (project_crew_id) on delete set null;

-- Migrate task assignments to use project_crew
update project_tasks pt
set assigned_project_crew_id = pc.project_crew_id
from project_crew pc
join project_roles pr on pr.role_id = pc.role_id and pr.project_id = pc.project_id
where pt.assigned_project_role_id = pr.project_role_id
and pt.project_id = pc.project_id
and pc.is_active = true;

-- Step 7: Create indexes for new tables and columns
create index if not exists idx_project_crew_project_id on public.project_crew using btree (project_id) tablespace pg_default;
create index if not exists idx_project_crew_user_id on public.project_crew using btree (user_id) tablespace pg_default;
create index if not exists idx_project_crew_role_id on public.project_crew using btree (role_id) tablespace pg_default;
create index if not exists idx_project_crew_department_id on public.project_crew using btree (department_id) tablespace pg_default;
create index if not exists idx_project_crew_active on public.project_crew using btree (is_active) tablespace pg_default;
create index if not exists idx_project_crew_lead on public.project_crew using btree (is_lead) tablespace pg_default;
create index if not exists idx_project_crew_project_role on public.project_crew using btree (project_id, role_id) tablespace pg_default;
create index if not exists idx_project_crew_project_user on public.project_crew using btree (project_id, user_id) tablespace pg_default;
create index if not exists idx_project_crew_joined_date on public.project_crew using btree (joined_date) tablespace pg_default;

create index if not exists idx_project_roles_required_count on public.project_roles using btree (required_count) tablespace pg_default;
create index if not exists idx_project_roles_filled_count on public.project_roles using btree (filled_count) tablespace pg_default;

create index if not exists idx_project_tasks_assigned_crew on public.project_tasks using btree (assigned_project_crew_id) tablespace pg_default;

create index if not exists idx_users_first_name on public.users using btree (first_name) tablespace pg_default;
create index if not exists idx_users_last_name on public.users using btree (last_name) tablespace pg_default;
create index if not exists idx_users_phone on public.users using btree (phone) tablespace pg_default;
create index if not exists idx_users_employment_status on public.users using btree (employment_status) tablespace pg_default;
create index if not exists idx_users_hire_date on public.users using btree (hire_date) tablespace pg_default;

-- Step 8: Create triggers
create trigger update_project_crew_updated_at before
update on project_crew for each row
execute function update_updated_at_column ();

-- Step 9: Include project crew functions
\i sql/project-crew-functions.sql

-- Step 10: Update table comments
comment on table public.users is 'Global user identity - stores personal information that persists across all projects';
comment on column public.users.role is 'Legacy field - roles are now project-specific in project_crew table';
comment on column public.users.department is 'Legacy field - departments are now project-specific in project_crew table';
comment on column public.users.employment_status is 'Overall employment status with the organization';

comment on table public.project_crew is 'Project-specific crew assignments - defines what role a user plays in a specific project';
comment on table public.project_roles is 'Project roles from template - tracks required vs filled positions';

-- Step 11: Grant permissions
grant all on table public.project_crew to authenticated;
grant all on all functions in schema public to authenticated;
