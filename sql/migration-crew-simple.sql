-- Simple migration for project crew model
-- This script safely migrates to the project-centric crew model

-- Step 1: Create project_crew table
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

-- Step 2: Add required_count and filled_count to project_roles
alter table project_roles 
  add column if not exists required_count integer not null default 1,
  add column if not exists filled_count integer not null default 0;

-- Step 3: Add assigned_project_crew_id to project_tasks
alter table project_tasks 
  add column if not exists assigned_project_crew_id uuid;

-- Step 4: Add foreign key constraint for project_tasks (with existence check)
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

-- Step 5: Create indexes
create index if not exists idx_project_crew_project_id on public.project_crew using btree (project_id);
create index if not exists idx_project_crew_user_id on public.project_crew using btree (user_id);
create index if not exists idx_project_crew_role_id on public.project_crew using btree (role_id);
create index if not exists idx_project_crew_active on public.project_crew using btree (is_active);
create index if not exists idx_project_tasks_assigned_crew on public.project_tasks using btree (assigned_project_crew_id);

-- Step 6: Create trigger (with existence check)
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

-- Step 7: Drop and recreate the crew details function with correct types
drop function if exists public.get_project_crew_with_details(uuid);

create or replace function public.get_project_crew_with_details(
  p_project_id uuid
) returns table (
  project_crew_id uuid,
  user_id uuid,
  user_name text,
  user_email text,
  role_id uuid,
  role_name character varying(100),
  department_id uuid,
  department_name character varying(100),
  is_lead boolean,
  is_active boolean,
  joined_date date,
  left_date date,
  notes text,
  task_count bigint,
  completed_task_count bigint
)
language plpgsql
security definer
as $$
begin
  return query
  select 
    pc.project_crew_id,
    pc.user_id,
    u.name as user_name,
    u.email as user_email,
    pc.role_id,
    pc.role_name,
    pc.department_id,
    pc.department_name,
    pc.is_lead,
    pc.is_active,
    pc.joined_date,
    pc.left_date,
    pc.notes,
    coalesce(task_stats.task_count, 0) as task_count,
    coalesce(task_stats.completed_task_count, 0) as completed_task_count
  from project_crew pc
  join users u on u.id = pc.user_id
  left join (
    select 
      assigned_project_crew_id,
      count(*) as task_count,
      count(case when task_status = 'completed' then 1 end) as completed_task_count
    from project_tasks
    where project_id = p_project_id
    and is_archived = false
    and assigned_project_crew_id is not null
    group by assigned_project_crew_id
  ) task_stats on task_stats.assigned_project_crew_id = pc.project_crew_id
  where pc.project_id = p_project_id
  order by pc.department_name, pc.role_name, u.name;
end;
$$;

-- Step 8: Grant permissions
grant all on table public.project_crew to authenticated;
grant execute on function public.get_project_crew_with_details to authenticated;
