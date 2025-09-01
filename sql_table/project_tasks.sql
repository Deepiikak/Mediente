-- Project Tasks table - flat structure with denormalized phase/step data
create table public.project_tasks (
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
  assigned_project_crew_id uuid null,
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
  constraint project_tasks_assigned_project_crew_id_fkey foreign key (assigned_project_crew_id) references project_crew (project_crew_id) on delete set null,
  constraint project_tasks_parent_task_id_fkey foreign key (parent_task_id) references project_tasks (project_task_id) on delete set null,
  constraint project_tasks_checklist_items_is_array check ((jsonb_typeof(checklist_items) = 'array'::text)),
  constraint project_tasks_estimated_hours_check check ((estimated_hours >= 0)),
  constraint project_tasks_actual_hours_check check ((actual_hours >= 0))
) tablespace pg_default;

-- Indexes for performance
create index if not exists idx_project_tasks_project_id on public.project_tasks using btree (project_id) tablespace pg_default;
create index if not exists idx_project_tasks_status on public.project_tasks using btree (task_status) tablespace pg_default;
create index if not exists idx_project_tasks_assigned_role on public.project_tasks using btree (assigned_project_role_id) tablespace pg_default;
create index if not exists idx_project_tasks_assigned_crew on public.project_tasks using btree (assigned_project_crew_id) tablespace pg_default;
create index if not exists idx_project_tasks_parent_task on public.project_tasks using btree (parent_task_id) tablespace pg_default;
create index if not exists idx_project_tasks_ordering on public.project_tasks using btree (phase_order, step_order, task_order) tablespace pg_default;
create index if not exists idx_project_tasks_archived on public.project_tasks using btree (is_archived) tablespace pg_default;
create index if not exists idx_project_tasks_category on public.project_tasks using btree (category) tablespace pg_default;
create index if not exists idx_project_tasks_phase_name on public.project_tasks using btree (phase_name) tablespace pg_default;

-- GIN index for checklist items
create index if not exists idx_project_tasks_checklist_items on public.project_tasks using gin (checklist_items) tablespace pg_default;

-- Trigger to update timestamp
create trigger update_project_tasks_updated_at before
update on project_tasks for each row
execute function update_updated_at_column ();

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
