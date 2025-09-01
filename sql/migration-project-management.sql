-- Migration: Project Management System
-- This migration creates the project management tables and functions

-- Create project status enum if it doesn't exist
do $$
begin
    if not exists (select 1 from pg_type where typname = 'project_status_type') then
        create type public.project_status_type as enum (
            'planning',
            'active',
            'on_hold',
            'completed',
            'cancelled'
        );
    end if;
end$$;

-- Create task status enum if it doesn't exist
do $$
begin
    if not exists (select 1 from pg_type where typname = 'task_status_type') then
        create type public.task_status_type as enum (
            'pending',
            'ready',
            'in_progress',
            'completed',
            'blocked',
            'cancelled'
        );
    end if;
end$$;

-- Projects table - stores project information with JSONB task snapshot
create table if not exists public.projects (
  project_id uuid not null default gen_random_uuid (),
  project_name character varying(200) not null,
  project_description text null,
  project_status public.project_status_type not null default 'planning',
  project_start_date date null,
  project_end_date date null,
  template_id uuid not null,
  template_snapshot jsonb not null, -- Complete task hierarchy from template
  is_archived boolean not null default false,
  created_by character varying(255) not null,
  updated_by character varying(255) null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint projects_pkey primary key (project_id),
  constraint projects_template_id_fkey foreign key (template_id) references project_templates (template_id) on delete restrict,
  constraint projects_description_check check ((char_length(project_description) <= 1000)),
  constraint projects_project_name_check check ((char_length(project_name) >= 3))
) tablespace pg_default;

-- Indexes for projects table
create index if not exists idx_projects_name on public.projects using btree (project_name) tablespace pg_default;
create index if not exists idx_projects_status on public.projects using btree (project_status) tablespace pg_default;
create index if not exists idx_projects_archived on public.projects using btree (is_archived) tablespace pg_default;
create index if not exists idx_projects_template_id on public.projects using btree (template_id) tablespace pg_default;
create index if not exists idx_projects_start_date on public.projects using btree (project_start_date) tablespace pg_default;
create index if not exists idx_projects_created_at on public.projects using btree (created_at) tablespace pg_default;
create index if not exists idx_projects_created_by on public.projects using btree (created_by) tablespace pg_default;
create index if not exists idx_projects_template_snapshot on public.projects using gin (template_snapshot) tablespace pg_default;

-- Trigger for projects table
create trigger update_projects_updated_at before
update on projects for each row
execute function update_updated_at_column ();

-- Project Roles table - stores roles extracted from template for each project
create table if not exists public.project_roles (
  project_role_id uuid not null default gen_random_uuid (),
  project_id uuid not null,
  role_id uuid not null,
  role_name character varying(100) not null,
  department_id uuid not null,
  department_name character varying(100) not null,
  assigned_user_id uuid null,
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
  constraint project_roles_assigned_user_id_fkey foreign key (assigned_user_id) references users (id) on delete set null
) tablespace pg_default;

-- Indexes for project_roles table
create index if not exists idx_project_roles_project_id on public.project_roles using btree (project_id) tablespace pg_default;
create index if not exists idx_project_roles_role_id on public.project_roles using btree (role_id) tablespace pg_default;
create index if not exists idx_project_roles_department_id on public.project_roles using btree (department_id) tablespace pg_default;
create index if not exists idx_project_roles_assigned_user on public.project_roles using btree (assigned_user_id) tablespace pg_default;
create index if not exists idx_project_roles_active on public.project_roles using btree (is_active) tablespace pg_default;

-- Trigger for project_roles table
create trigger update_project_roles_updated_at before
update on project_roles for each row
execute function update_updated_at_column ();

-- Project Tasks table - flat structure with denormalized phase/step data
create table if not exists public.project_tasks (
  project_task_id uuid not null default gen_random_uuid (),
  project_id uuid not null,
  task_name character varying(200) not null,
  task_description text null,
  phase_name character varying(200) not null,
  phase_order integer not null,
  step_name character varying(200) not null,
  step_order integer not null,
  task_order integer not null,
  estimated_hours integer null,
  actual_hours integer null,
  assigned_project_role_id uuid null,
  assigned_user_id uuid null,
  parent_task_id uuid null,
  task_status public.task_status_type not null default 'pending',
  category public.task_category_type null,
  checklist_items jsonb null default '[]'::jsonb,
  started_at timestamp with time zone null,
  completed_at timestamp with time zone null,
  is_archived boolean not null default false,
  created_by character varying(255) not null,
  updated_by character varying(255) null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint project_tasks_pkey primary key (project_task_id),
  constraint project_tasks_project_id_fkey foreign key (project_id) references projects (project_id) on delete cascade,
  constraint project_tasks_assigned_project_role_id_fkey foreign key (assigned_project_role_id) references project_roles (project_role_id) on delete set null,
  constraint project_tasks_assigned_user_id_fkey foreign key (assigned_user_id) references users (id) on delete set null,
  constraint project_tasks_parent_task_id_fkey foreign key (parent_task_id) references project_tasks (project_task_id) on delete set null,
  constraint project_tasks_checklist_items_is_array check ((jsonb_typeof(checklist_items) = 'array'::text)),
  constraint project_tasks_estimated_hours_check check ((estimated_hours >= 0)),
  constraint project_tasks_actual_hours_check check ((actual_hours >= 0))
) tablespace pg_default;

-- Indexes for project_tasks table
create index if not exists idx_project_tasks_project_id on public.project_tasks using btree (project_id) tablespace pg_default;
create index if not exists idx_project_tasks_status on public.project_tasks using btree (task_status) tablespace pg_default;
create index if not exists idx_project_tasks_assigned_role on public.project_tasks using btree (assigned_project_role_id) tablespace pg_default;
create index if not exists idx_project_tasks_assigned_user on public.project_tasks using btree (assigned_user_id) tablespace pg_default;
create index if not exists idx_project_tasks_parent_task on public.project_tasks using btree (parent_task_id) tablespace pg_default;
create index if not exists idx_project_tasks_ordering on public.project_tasks using btree (phase_order, step_order, task_order) tablespace pg_default;
create index if not exists idx_project_tasks_archived on public.project_tasks using btree (is_archived) tablespace pg_default;
create index if not exists idx_project_tasks_category on public.project_tasks using btree (category) tablespace pg_default;
create index if not exists idx_project_tasks_phase_name on public.project_tasks using btree (phase_name) tablespace pg_default;
create index if not exists idx_project_tasks_checklist_items on public.project_tasks using gin (checklist_items) tablespace pg_default;

-- Trigger for project_tasks table
create trigger update_project_tasks_updated_at before
update on project_tasks for each row
execute function update_updated_at_column ();

-- Drop functions if they exist (for re-creation)
drop function if exists public.create_project_from_template(text, text, uuid, date, text);
drop function if exists public.assign_user_to_project_role(uuid, uuid);
drop function if exists public.start_project_task(uuid, uuid);
drop function if exists public.complete_project_task(uuid);

-- Include the project functions from project-functions.sql
\i sql/project-functions.sql

-- Grant necessary permissions
grant usage on schema public to authenticated;
grant all on all tables in schema public to authenticated;
grant all on all sequences in schema public to authenticated;
grant all on all functions in schema public to authenticated;
