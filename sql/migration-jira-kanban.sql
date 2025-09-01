-- Complete migration for Jira-style Kanban task management with project crew model

-- Step 1: Create project_crew table first
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
  constraint project_crew_department_id_fkey foreign key (department_id) references departments (department_id) on delete restrict
);

-- Step 2: Update task status enum for Jira-style workflow
drop type if exists public.task_status_type cascade;
create type public.task_status_type as enum (
  'pending',
  'ongoing', 
  'completed',
  'escalated'
);

-- Step 3: Update project_roles table for crew model
alter table project_roles 
  add column if not exists required_count integer not null default 1,
  add column if not exists filled_count integer not null default 0;

-- Remove assigned_user_id if it exists
do $$
begin
  if exists (select 1 from information_schema.columns where table_name = 'project_roles' and column_name = 'assigned_user_id') then
    alter table project_roles drop column assigned_user_id;
  end if;
end $$;

-- Step 4: Update project_tasks table for automation and crew model
alter table project_tasks 
  add column if not exists assigned_project_crew_id uuid,
  add column if not exists expected_start_time timestamp with time zone null,
  add column if not exists expected_end_time timestamp with time zone null,
  add column if not exists actual_start_time timestamp with time zone null,
  add column if not exists actual_end_time timestamp with time zone null,
  add column if not exists is_critical boolean not null default false,
  add column if not exists escalation_reason text null,
  add column if not exists escalated_at timestamp with time zone null,
  add column if not exists file_attachments jsonb null default '[]'::jsonb,
  add column if not exists comments jsonb null default '[]'::jsonb;

-- Remove assigned_user_id if it exists
do $$
begin
  if exists (select 1 from information_schema.columns where table_name = 'project_tasks' and column_name = 'assigned_user_id') then
    alter table project_tasks drop column assigned_user_id;
  end if;
end $$;

-- Step 5: Add foreign key constraint for project_crew
do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints 
    where constraint_name = 'project_tasks_assigned_project_crew_id_fkey'
  ) then
    alter table project_tasks
      add constraint project_tasks_assigned_project_crew_id_fkey 
      foreign key (assigned_project_crew_id) references project_crew (project_crew_id) on delete set null;
  end if;
end $$;

-- Step 6: Create indexes
create index if not exists idx_project_crew_project_id on public.project_crew using btree (project_id);
create index if not exists idx_project_crew_user_id on public.project_crew using btree (user_id);
create index if not exists idx_project_crew_role_id on public.project_crew using btree (role_id);
create index if not exists idx_project_crew_active on public.project_crew using btree (is_active);
create index if not exists idx_project_tasks_assigned_crew on public.project_tasks using btree (assigned_project_crew_id);
create index if not exists idx_project_tasks_expected_end_time on public.project_tasks using btree (expected_end_time);
create index if not exists idx_project_tasks_is_critical on public.project_tasks using btree (is_critical);
create index if not exists idx_project_tasks_escalated_at on public.project_tasks using btree (escalated_at);

-- Step 7: Create trigger
do $$
begin
  if not exists (
    select 1 from information_schema.triggers 
    where trigger_name = 'update_project_crew_updated_at'
  ) then
    create trigger update_project_crew_updated_at before
    update on project_crew for each row
    execute function update_updated_at_column ();
  end if;
end $$;

-- Step 8: Include automation functions
\i sql/task-automation-update.sql

-- Step 9: Include crew management functions  
\i sql/project-crew-functions.sql

-- Step 10: Grant permissions
grant all on table public.project_crew to authenticated;
