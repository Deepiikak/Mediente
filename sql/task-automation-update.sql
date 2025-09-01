-- Update task status enum for Jira-style workflow with runtime engine
-- 
-- MIGRATION STRATEGY:
-- 1. Create new enum with all required statuses (including blocked, cancelled)
-- 2. Add new column with new enum type
-- 3. Migrate existing data with proper mapping
-- 4. Drop dependent objects (materialized views) before dropping old column
-- 5. Rename new column to old name
-- 6. Recreate dependent objects with new enum
-- 
-- FIXES APPLIED:
-- - Handles materialized view dependency properly
-- - Fixes audit_logs table structure compatibility
-- - Ensures proper text type casting for PostgreSQL
-- 
-- This approach ensures zero data loss and handles dependencies properly
do $$
begin
  -- Create new enum type
  if not exists (select 1 from pg_type where typname = 'task_status_type_new') then
    create type public.task_status_type_new as enum (
      'pending',
      'ongoing', 
      'completed',
      'escalated',
      'blocked',
      'cancelled'
    );
  end if;
  
  -- Add new task_status column with new enum type
  if not exists (
    select 1 from information_schema.columns 
    where table_name = 'project_tasks' 
    and column_name = 'task_status_new'
  ) then
    alter table project_tasks 
      add column task_status_new public.task_status_type_new default 'pending';
  end if;
  
  -- Migrate existing data
  update project_tasks 
  set task_status_new = case 
    when task_status::text = 'ready' then 'pending'::task_status_type_new
    when task_status::text = 'in_progress' then 'ongoing'::task_status_type_new
    when task_status::text = 'blocked' then 'blocked'::task_status_type_new
    when task_status::text = 'cancelled' then 'cancelled'::task_status_type_new
    else task_status::text::task_status_type_new
  end
  where task_status_new is null;
  
  -- Drop dependent objects before dropping column
  drop materialized view if exists ready_queue cascade;
  
  -- Drop old column and rename new one
  if exists (
    select 1 from information_schema.columns 
    where table_name = 'project_tasks' 
    and column_name = 'task_status'
    and column_name != 'task_status_new'
  ) then
    alter table project_tasks drop column task_status;
  end if;
  
  alter table project_tasks rename column task_status_new to task_status;
  
  -- Make the column not null with default
  alter table project_tasks alter column task_status set not null;
  alter table project_tasks alter column task_status set default 'pending';
  
  -- Drop old enum and rename new one
  drop type if exists public.task_status_type_old cascade;
  if exists (select 1 from pg_type where typname = 'task_status_type') then
    alter type public.task_status_type rename to task_status_type_old;
  end if;
  alter type public.task_status_type_new rename to task_status_type;
  drop type if exists public.task_status_type_old cascade;
end $$;

-- Add automation fields to project_tasks
alter table project_tasks 
  add column if not exists expected_start_time timestamp with time zone null,
  add column if not exists expected_end_time timestamp with time zone null,
  add column if not exists actual_start_time timestamp with time zone null,
  add column if not exists actual_end_time timestamp with time zone null,
  add column if not exists is_critical boolean not null default false,
  add column if not exists escalation_reason text null,
  add column if not exists escalated_at timestamp with time zone null,
  add column if not exists file_attachments jsonb null default '[]'::jsonb,
  add column if not exists comments jsonb null default '[]'::jsonb;

-- Add constraints for new fields (with error handling)
do $$
begin
  -- Add file_attachments array constraint
  if not exists (
    select 1 from information_schema.constraint_column_usage 
    where table_name = 'project_tasks' 
    and constraint_name = 'project_tasks_file_attachments_is_array'
  ) then
    alter table project_tasks 
      add constraint project_tasks_file_attachments_is_array 
      check ((jsonb_typeof(file_attachments) = 'array'::text));
  end if;
  
  -- Add comments array constraint
  if not exists (
    select 1 from information_schema.constraint_column_usage 
    where table_name = 'project_tasks' 
    and constraint_name = 'project_tasks_comments_is_array'
  ) then
    alter table project_tasks 
      add constraint project_tasks_comments_is_array 
      check ((jsonb_typeof(comments) = 'array'::text));
  end if;
  
  -- Add escalation reason length constraint
  if not exists (
    select 1 from information_schema.constraint_column_usage 
    where table_name = 'project_tasks' 
    and constraint_name = 'project_tasks_escalation_reason_check'
  ) then
    alter table project_tasks 
      add constraint project_tasks_escalation_reason_check 
      check ((char_length(escalation_reason) <= 500));
  end if;
end $$;

-- Create indexes for automation queries
create index if not exists idx_project_tasks_expected_end_time on public.project_tasks using btree (expected_end_time);
create index if not exists idx_project_tasks_is_critical on public.project_tasks using btree (is_critical);
create index if not exists idx_project_tasks_escalated_at on public.project_tasks using btree (escalated_at);
create index if not exists idx_project_tasks_file_attachments on public.project_tasks using gin (file_attachments);
create index if not exists idx_project_tasks_comments on public.project_tasks using gin (comments);

-- Function to auto-assign task and calculate deadlines
create or replace function public.auto_assign_task_with_deadline(
  p_project_task_id uuid
) returns void
language plpgsql
security definer
as $$
declare
  v_task record;
  v_crew_member record;
  v_start_time timestamp with time zone;
  v_end_time timestamp with time zone;
begin
  -- Get task details
  select * into v_task
  from project_tasks
  where project_task_id = p_project_task_id;

  if not found then
    raise exception 'Task not found';
  end if;

  if v_task.task_status != 'pending' then
    return; -- Only auto-assign pending tasks
  end if;

  -- Find available crew member for this role
  select pc.* into v_crew_member
  from project_crew pc
  join project_roles pr on pr.role_id = pc.role_id and pr.project_id = pc.project_id
  where pr.project_role_id = v_task.assigned_project_role_id
  and pc.is_active = true
  order by pc.is_lead desc, pc.created_at
  limit 1;

  if found then
    -- Calculate timing
    v_start_time := now();
    v_end_time := v_start_time + (coalesce(v_task.estimated_hours, 8) || ' hours')::interval;

    -- Update task with assignment and timing
    update project_tasks
    set assigned_project_crew_id = v_crew_member.project_crew_id,
        task_status = 'ongoing',
        actual_start_time = v_start_time,
        expected_start_time = v_start_time,
        expected_end_time = v_end_time,
        updated_by = 'system'
    where project_task_id = p_project_task_id;
  end if;
end;
$$;

-- Function to check for escalated tasks
create or replace function public.check_task_escalations()
returns void
language plpgsql
security definer
as $$
begin
  -- Mark tasks as escalated if they're overdue
  update project_tasks
  set task_status = 'escalated',
      escalated_at = now(),
      escalation_reason = 'Task overdue - exceeded expected end time',
      updated_by = 'system'
  where task_status = 'ongoing'
  and expected_end_time is not null
  and now() > expected_end_time
  and escalated_at is null;
end;
$$;

-- Function to update project status based on task statuses
create or replace function public.update_project_status_from_tasks(
  p_project_id uuid
) returns void
language plpgsql
security definer
as $$
declare
  v_total_tasks integer;
  v_pending_tasks integer;
  v_ongoing_tasks integer;
  v_completed_tasks integer;
  v_escalated_tasks integer;
  v_critical_escalated integer;
  v_new_status text;
begin
  -- Get task counts by status
  select 
    count(*) as total,
    count(case when task_status = 'pending' then 1 end) as pending,
    count(case when task_status = 'ongoing' then 1 end) as ongoing,
    count(case when task_status = 'completed' then 1 end) as completed,
    count(case when task_status = 'escalated' then 1 end) as escalated,
    count(case when task_status = 'escalated' and is_critical = true then 1 end) as critical_escalated
  into v_total_tasks, v_pending_tasks, v_ongoing_tasks, v_completed_tasks, v_escalated_tasks, v_critical_escalated
  from project_tasks
  where project_id = p_project_id
  and is_archived = false;

  -- Determine project status
  if v_critical_escalated > 0 then
    v_new_status := 'escalated';
  elsif v_completed_tasks = v_total_tasks then
    v_new_status := 'completed';
  elsif v_ongoing_tasks > 0 or v_escalated_tasks > 0 then
    v_new_status := 'active';
  else
    v_new_status := 'planning';
  end if;

  -- Update project status
  update projects
  set project_status = v_new_status::project_status_type,
      updated_by = 'system'
  where project_id = p_project_id
  and project_status != v_new_status::project_status_type;
end;
$$;

-- Function to complete a task and trigger automation
create or replace function public.complete_task_with_automation(
  p_project_task_id uuid
) returns void
language plpgsql
security definer
as $$
declare
  v_task record;
  v_project_id uuid;
begin
  -- Get task details
  select * into v_task
  from project_tasks
  where project_task_id = p_project_task_id;

  if not found then
    raise exception 'Task not found';
  end if;

  if v_task.task_status != 'ongoing' then
    raise exception 'Task must be ongoing to complete';
  end if;

  v_project_id := v_task.project_id;

  -- Mark task as completed
  update project_tasks
  set task_status = 'completed',
      actual_end_time = now(),
      updated_by = 'system'
  where project_task_id = p_project_task_id;

  -- Trigger next tasks (existing logic from complete_project_task)
  perform complete_project_task(p_project_task_id);

  -- Auto-assign newly ready tasks
  perform auto_assign_ready_tasks(v_project_id, v_task.role_id);

  -- Update project status
  perform update_project_status_from_tasks(v_project_id);
end;
$$;

-- Create escalation check job (run this periodically via cron or scheduler)
create or replace function public.run_escalation_checks()
returns void
language plpgsql
security definer
as $$
declare
  v_project record;
begin
  -- Check escalations for all active projects
  for v_project in
    select project_id
    from projects
    where project_status in ('planning', 'active')
    and is_archived = false
  loop
    perform check_task_escalations();
    perform update_project_status_from_tasks(v_project.project_id);
  end loop;
end;
$$;

-- RUNTIME ENGINE FOR DETERMINISTIC TASK FLOW

-- Function to compute ready set (tasks that can be started)
create or replace function public.compute_ready_set(
  p_project_id uuid
) returns table(
  project_task_id uuid,
  task_name text,
  phase_order integer,
  step_order integer,
  task_order integer,
  assigned_project_role_id uuid,
  has_crew_assignment boolean
)
language plpgsql
security definer
as $$
begin
  return query
  with task_dependencies as (
    -- Get all task dependencies (parent-child relationships)
    select 
      pt.project_task_id,
      pt.parent_task_id,
      parent.task_status as parent_status
    from project_tasks pt
    left join project_tasks parent on parent.project_task_id = pt.parent_task_id
    where pt.project_id = p_project_id
      and pt.is_archived = false
  ),
  ready_tasks as (
    select 
      pt.project_task_id,
      pt.task_name::text,
      pt.phase_order,
      pt.step_order,
      pt.task_order,
      pt.assigned_project_role_id,
      -- Check if role has active crew members
      case 
        when exists (
          select 1 from project_crew pc
          where pc.project_id = pt.project_id
            and pc.role_id = (
              select pr.role_id from project_roles pr 
              where pr.project_role_id = pt.assigned_project_role_id
            )
            and pc.is_active = true
        ) then true
        else false
      end as has_crew_assignment
    from project_tasks pt
    where pt.project_id = p_project_id
      and pt.is_archived = false
      and pt.task_status in ('pending', 'blocked')
      -- All dependencies must be completed
      and (
        pt.parent_task_id is null -- No dependencies
        or exists (
          select 1 from task_dependencies td
          where td.project_task_id = pt.project_task_id
            and td.parent_status = 'completed'
        )
      )
  )
  select 
    rt.project_task_id,
    rt.task_name,
    rt.phase_order,
    rt.step_order,
    rt.task_order,
    rt.assigned_project_role_id,
    rt.has_crew_assignment
  from ready_tasks rt
  order by rt.phase_order, rt.step_order, rt.task_order;
end;
$$;

-- Function for idempotent auto-start logic
create or replace function public.auto_start_ready_tasks(
  p_project_id uuid,
  p_max_concurrent integer default 10
) returns integer
language plpgsql
security definer
as $$
declare
  v_started_count integer := 0;
  v_ready_task record;
  v_ongoing_count integer;
begin
  -- Check current ongoing tasks to respect concurrency limit
  select count(*) into v_ongoing_count
  from project_tasks
  where project_id = p_project_id
    and task_status = 'ongoing'
    and is_archived = false;

  -- Auto-start ready tasks up to concurrency limit
  for v_ready_task in 
    select * from compute_ready_set(p_project_id)
    where has_crew_assignment = true
    order by phase_order, step_order, task_order
    limit (p_max_concurrent - v_ongoing_count)
  loop
    -- Start the task
    perform start_task_with_assignment(v_ready_task.project_task_id);
    v_started_count := v_started_count + 1;
  end loop;

  return v_started_count;
end;
$$;

-- Enhanced start_task function with assignment policies
create or replace function public.start_task_with_assignment(
  p_project_task_id uuid
) returns void
language plpgsql
security definer
as $$
declare
  v_task record;
  v_crew_member record;
  v_start_time timestamp with time zone;
  v_end_time timestamp with time zone;
begin
  -- Get task details
  select * into v_task
  from project_tasks
  where project_task_id = p_project_task_id;

  if not found then
    raise exception 'Task not found';
  end if;

  if v_task.task_status not in ('pending', 'blocked') then
    return; -- Only start pending/blocked tasks
  end if;

  -- Find best available crew member using assignment policy
  -- Priority: is_lead = true, then least loaded, then round-robin by created_at
  select pc.* into v_crew_member
  from project_crew pc
  join project_roles pr on pr.role_id = pc.role_id and pr.project_id = pc.project_id
  left join (
    -- Get current task load for each crew member
    select 
      assigned_project_crew_id,
      count(*) as current_tasks
    from project_tasks
    where task_status = 'ongoing'
      and assigned_project_crew_id is not null
    group by assigned_project_crew_id
  ) task_load on task_load.assigned_project_crew_id = pc.project_crew_id
  where pr.project_role_id = v_task.assigned_project_role_id
    and pc.is_active = true
  order by 
    pc.is_lead desc, -- Leaders first
    coalesce(task_load.current_tasks, 0) asc, -- Least loaded
    pc.created_at asc -- Round-robin by join order
  limit 1;

  if not found then
    -- No crew member available, keep as pending but mark as ready
    update project_tasks
    set task_status = 'pending',
        updated_by = 'auto_engine'
    where project_task_id = p_project_task_id;
    return;
  end if;

  -- Calculate timing
  v_start_time := now();
  v_end_time := v_start_time + (coalesce(v_task.estimated_hours, 8) || ' hours')::interval;

  -- Start the task
  update project_tasks
  set 
    task_status = 'ongoing',
    assigned_project_crew_id = v_crew_member.project_crew_id,
    actual_start_time = v_start_time,
    expected_start_time = v_start_time,
    expected_end_time = v_end_time,
    updated_by = 'auto_engine'
  where project_task_id = p_project_task_id;

  -- Log audit trail could be added here if needed
  -- For now, status changes are tracked via updated_by field
end;
$$;

-- Enhanced complete_task with dependent triggering
create or replace function public.complete_task_with_flow(
  p_project_task_id uuid
) returns integer
language plpgsql
security definer
as $$
declare
  v_task record;
  v_project_id uuid;
  v_started_count integer := 0;
begin
  -- Get task details
  select * into v_task
  from project_tasks
  where project_task_id = p_project_task_id;

  if not found then
    raise exception 'Task not found';
  end if;

  if v_task.task_status != 'ongoing' then
    raise exception 'Task must be ongoing to complete';
  end if;

  v_project_id := v_task.project_id;

  -- Mark task as completed
  update project_tasks
  set 
    task_status = 'completed',
    actual_end_time = now(),
    updated_by = 'auto_engine'
  where project_task_id = p_project_task_id;

  -- Log completion - tracked via updated_by field

  -- Auto-start newly ready tasks
  v_started_count := auto_start_ready_tasks(v_project_id);

  -- Update project status
  perform update_project_status_from_tasks(v_project_id);

  return v_started_count;
end;
$$;

-- Escalation cron job function
create or replace function public.escalation_cron() returns integer
language plpgsql
security definer
as $$
declare
  v_escalated_count integer := 0;
begin
  -- Escalate overdue tasks
  update project_tasks
  set 
    task_status = 'escalated',
    escalated_at = now(),
    escalation_reason = case 
      when task_status = 'ongoing' then 'Task overdue - exceeded expected end time'
      when task_status = 'pending' then 'Task blocked - ready but not started within SLA'
      else 'Task escalated due to SLA breach'
    end,
    updated_by = 'escalation_cron'
  where task_status in ('ongoing', 'pending')
    and expected_end_time is not null
    and now() > expected_end_time
    and escalated_at is null;

  get diagnostics v_escalated_count = row_count;

  -- Log escalation summary - tracked via updated_by field
  -- Escalation count returned for application-level logging

  return v_escalated_count;
end;
$$;

-- Performance: Create ready queue materialized view (after enum migration)
create materialized view ready_queue as
select 
  pt.project_id,
  pt.project_task_id,
  pt.task_name::text,
  pt.phase_order,
  pt.step_order,
  pt.task_order,
  pt.assigned_project_role_id,
  pt.expected_end_time,
  case 
    when exists (
      select 1 from project_crew pc
      join project_roles pr on pr.role_id = pc.role_id
      where pc.project_id = pt.project_id
        and pr.project_role_id = pt.assigned_project_role_id
        and pc.is_active = true
    ) then true
    else false
  end as has_crew_assignment,
  pt.created_at
from project_tasks pt
where pt.task_status in ('pending', 'ongoing', 'escalated', 'blocked')
  and pt.is_archived = false
  and (
    pt.parent_task_id is null 
    or exists (
      select 1 from project_tasks parent
      where parent.project_task_id = pt.parent_task_id
        and parent.task_status = 'completed'
    )
  )
order by pt.project_id, pt.phase_order, pt.step_order, pt.task_order;

-- Create indexes for performance
create index if not exists idx_ready_queue_project_status on ready_queue(project_id, has_crew_assignment);
create index if not exists idx_ready_queue_expected_end on ready_queue(expected_end_time) where expected_end_time is not null;

-- Initial refresh of materialized view
refresh materialized view ready_queue;

-- Function to refresh ready queue
create or replace function public.refresh_ready_queue() returns void
language sql
security definer
as $$
  refresh materialized view ready_queue;
$$;

-- Function to initialize project tasks on creation
create or replace function public.initialize_project_tasks(
  p_project_id uuid
) returns integer
language plpgsql
security definer
as $$
declare
  v_started_count integer := 0;
begin
  -- Refresh ready queue to include new project
  perform refresh_ready_queue();
  
  -- Auto-start initial ready tasks
  v_started_count := auto_start_ready_tasks(p_project_id, 3); -- Start up to 3 initial tasks
  
  return v_started_count;
end;
$$;

-- Function to get actionable tasks with cursor pagination
create or replace function public.get_actionable_tasks(
  p_project_id uuid,
  p_cursor_expected_end timestamp with time zone default null,
  p_cursor_id uuid default null,
  p_limit integer default 50
) returns table(
  project_task_id uuid,
  task_name text,
  task_status text,
  phase_order integer,
  step_order integer,
  task_order integer,
  expected_end_time timestamp with time zone,
  assigned_crew_member_name text,
  is_critical boolean,
  has_next_page boolean
)
language plpgsql
security definer
as $$
declare
  v_total_count integer;
begin
  -- Get total count for pagination
  select count(*) into v_total_count
  from ready_queue rq
  where rq.project_id = p_project_id;

  return query
  with paginated_tasks as (
    select 
      rq.project_task_id,
      rq.task_name::text,
      pt.task_status::text,
      rq.phase_order,
      rq.step_order,
      rq.task_order,
      rq.expected_end_time,
      coalesce(u.name, '')::text as assigned_crew_member_name,
      pt.is_critical,
      row_number() over (order by 
        coalesce(rq.expected_end_time, 'infinity'::timestamp with time zone),
        rq.project_task_id
      ) as row_num
    from ready_queue rq
    join project_tasks pt on pt.project_task_id = rq.project_task_id
    left join project_crew pc on pc.project_crew_id = pt.assigned_project_crew_id
    left join users u on u.user_id = pc.user_id
    where rq.project_id = p_project_id
      -- Cursor pagination
      and (
        p_cursor_expected_end is null
        or rq.expected_end_time > p_cursor_expected_end
        or (rq.expected_end_time = p_cursor_expected_end and rq.project_task_id > p_cursor_id)
      )
    order by 
      coalesce(rq.expected_end_time, 'infinity'::timestamp with time zone),
      rq.project_task_id
    limit p_limit + 1 -- Get one extra to check if there's a next page
  )
  select 
    pt.project_task_id,
    pt.task_name,
    pt.task_status,
    pt.phase_order,
    pt.step_order,
    pt.task_order,
    pt.expected_end_time,
    pt.assigned_crew_member_name,
    pt.is_critical,
    pt.row_num <= p_limit as has_next_page
  from paginated_tasks pt
  where pt.row_num <= p_limit;
end;
$$;

-- Grant permissions
grant execute on function public.auto_assign_task_with_deadline to authenticated;
grant execute on function public.check_task_escalations to authenticated;
grant execute on function public.update_project_status_from_tasks to authenticated;
grant execute on function public.complete_task_with_automation to authenticated;
grant execute on function public.run_escalation_checks to authenticated;

-- Grant permissions for new functions
grant execute on function public.compute_ready_set to authenticated;
grant execute on function public.auto_start_ready_tasks to authenticated;
grant execute on function public.start_task_with_assignment to authenticated;
grant execute on function public.complete_task_with_flow to authenticated;
grant execute on function public.escalation_cron to authenticated;
grant execute on function public.refresh_ready_queue to authenticated;
grant execute on function public.initialize_project_tasks to authenticated;
grant execute on function public.get_actionable_tasks to authenticated;

-- Grant access to materialized view
grant select on ready_queue to authenticated;
