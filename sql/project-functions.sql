-- Function to create a project from a template
create or replace function public.create_project_from_template(
  p_project_name text,
  p_project_description text,
  p_template_id uuid,
  p_project_start_date date,
  p_created_by text
) returns uuid
language plpgsql
security definer
as $$
declare
  v_project_id uuid;
  v_template_snapshot jsonb;
  v_role record;
  v_task record;
  v_phase jsonb;
  v_step jsonb;
  v_task_data jsonb;
  v_project_role_id uuid;
  v_parent_mapping jsonb = '{}'::jsonb;
  v_new_task_id uuid;
begin
  -- Get template with all related data
  select jsonb_build_object(
    'template_id', t.template_id,
    'template_name', t.template_name,
    'description', t.description,
    'phases', (
      select jsonb_agg(
        jsonb_build_object(
          'phase_id', p.phase_id,
          'phase_name', p.phase_name,
          'phase_order', p.phase_order,
          'description', p.description,
          'steps', (
            select jsonb_agg(
              jsonb_build_object(
                'step_id', s.step_id,
                'step_name', s.step_name,
                'step_order', s.step_order,
                'description', s.description,
                'tasks', (
                  select jsonb_agg(
                    jsonb_build_object(
                      'task_id', st.task_id,
                      'task_name', st.task_name,
                      'description', st.description,
                      'task_order', st.task_order,
                      'estimated_hours', st.estimated_hours,
                      'assigned_role_id', st.assigned_role_id,
                      'parent_task_id', st.parent_task_id,
                      'category', st.category,
                      'checklist_items', st.checklist_items
                    ) order by st.task_order
                  )
                  from step_tasks st
                  where st.step_id = s.step_id
                  and st.is_archived = false
                )
              ) order by s.step_order
            )
            from phase_steps s
            where s.phase_id = p.phase_id
            and s.is_archived = false
          )
        ) order by p.phase_order
      )
      from template_phases p
      where p.template_id = t.template_id
      and p.is_archived = false
    )
  ) into v_template_snapshot
  from project_templates t
  where t.template_id = p_template_id
  and t.is_archived = false;

  if v_template_snapshot is null then
    raise exception 'Template not found or is archived';
  end if;

  -- Create the project
  insert into projects (
    project_name,
    project_description,
    project_status,
    project_start_date,
    template_id,
    template_snapshot,
    created_by
  ) values (
    p_project_name,
    p_project_description,
    'planning',
    p_project_start_date,
    p_template_id,
    v_template_snapshot,
    p_created_by
  ) returning project_id into v_project_id;

  -- Extract unique roles from tasks and create project roles
  for v_role in
    select distinct 
      st.assigned_role_id as role_id,
      dr.role_name,
      dr.department_id,
      d.department_name,
      count(*) as task_count
    from jsonb_array_elements(v_template_snapshot->'phases') as phase,
         jsonb_array_elements(phase->'steps') as step,
         jsonb_array_elements(step->'tasks') as task,
         lateral (select (task->>'assigned_role_id')::uuid as assigned_role_id) st
    join department_roles dr on dr.role_id = st.assigned_role_id
    join departments d on d.department_id = dr.department_id
    where st.assigned_role_id is not null
    group by st.assigned_role_id, dr.role_name, dr.department_id, d.department_name
  loop
    insert into project_roles (
      project_id,
      role_id,
      role_name,
      department_id,
      department_name,
      required_count,
      created_by
    ) values (
      v_project_id,
      v_role.role_id,
      v_role.role_name,
      v_role.department_id,
      v_role.department_name,
      1, -- Default to 1 person per role, can be adjusted later
      p_created_by
    );
  end loop;

  -- Create project tasks from template snapshot
  for v_phase in select * from jsonb_array_elements(v_template_snapshot->'phases')
  loop
    for v_step in select * from jsonb_array_elements(v_phase->'steps')
    loop
      for v_task_data in select * from jsonb_array_elements(v_step->'tasks')
      loop
        -- Get project role id for this task if role is assigned
        v_project_role_id := null;
        if v_task_data->>'assigned_role_id' is not null then
          select project_role_id into v_project_role_id
          from project_roles
          where project_id = v_project_id
          and role_id = (v_task_data->>'assigned_role_id')::uuid;
        end if;

        -- Insert task
        insert into project_tasks (
          project_id,
          task_name,
          task_description,
          phase_name,
          phase_order,
          step_name,
          step_order,
          task_order,
          estimated_hours,
          assigned_project_role_id,
          category,
          checklist_items,
          task_status,
          created_by
        ) values (
          v_project_id,
          v_task_data->>'task_name',
          v_task_data->>'description',
          v_phase->>'phase_name',
          (v_phase->>'phase_order')::integer,
          v_step->>'step_name',
          (v_step->>'step_order')::integer,
          (v_task_data->>'task_order')::integer,
          (v_task_data->>'estimated_hours')::integer,
          v_project_role_id,
          (v_task_data->>'category')::task_category_type,
          coalesce(v_task_data->'checklist_items', '[]'::jsonb),
          'pending',
          p_created_by
        ) returning project_task_id into v_new_task_id;

        -- Store mapping of old task_id to new project_task_id
        v_parent_mapping := v_parent_mapping || jsonb_build_object(v_task_data->>'task_id', v_new_task_id);
      end loop;
    end loop;
  end loop;

  -- Update parent_task_id references using the mapping
  for v_phase in select * from jsonb_array_elements(v_template_snapshot->'phases')
  loop
    for v_step in select * from jsonb_array_elements(v_phase->'steps')
    loop
      for v_task_data in select * from jsonb_array_elements(v_step->'tasks')
      loop
        if v_task_data->>'parent_task_id' is not null then
          update project_tasks
          set parent_task_id = (v_parent_mapping->>(v_task_data->>'parent_task_id'))::uuid
          where project_task_id = (v_parent_mapping->>(v_task_data->>'task_id'))::uuid;
        end if;
      end loop;
    end loop;
  end loop;

  -- Mark initial tasks as ready (tasks with no parent or whose parent is already completed)
  update project_tasks
  set task_status = 'ready'
  where project_id = v_project_id
  and parent_task_id is null
  and phase_order = 1
  and step_order = 1
  and task_order = 1;

  return v_project_id;
end;
$$;

-- Function to auto-assign tasks to crew members when they become ready
create or replace function public.auto_assign_ready_tasks(
  p_project_id uuid,
  p_role_id uuid
) returns void
language plpgsql
security definer
as $$
declare
  v_crew_member record;
  v_task record;
begin
  -- Get crew members for this role (prefer leads first)
  for v_crew_member in
    select project_crew_id, user_id
    from project_crew
    where project_id = p_project_id
    and role_id = p_role_id
    and is_active = true
    order by is_lead desc, created_at
  loop
    -- Assign ready tasks to this crew member
    for v_task in
      select project_task_id
      from project_tasks pt
      join project_roles pr on pr.project_role_id = pt.assigned_project_role_id
      where pt.project_id = p_project_id
      and pr.role_id = p_role_id
      and pt.task_status = 'ready'
      and pt.assigned_project_crew_id is null
      order by pt.phase_order, pt.step_order, pt.task_order
      limit 1 -- Assign one task at a time
    loop
      update project_tasks
      set assigned_project_crew_id = v_crew_member.project_crew_id
      where project_task_id = v_task.project_task_id;
      
      exit; -- Only assign one task per crew member at a time
    end loop;
  end loop;
end;
$$;

-- Function to start a project task (updated for crew model)
create or replace function public.start_project_task(
  p_project_task_id uuid,
  p_project_crew_id uuid default null
) returns void
language plpgsql
security definer
as $$
declare
  v_task record;
  v_updated_by text;
  v_assigned_crew_id uuid;
begin
  -- Get current user
  select auth.email() into v_updated_by;

  -- Get task details
  select * into v_task
  from project_tasks
  where project_task_id = p_project_task_id;

  if not found then
    raise exception 'Task not found';
  end if;

  if v_task.task_status != 'ready' then
    raise exception 'Task is not ready to be started';
  end if;

  -- Determine assigned crew member
  v_assigned_crew_id := coalesce(p_project_crew_id, v_task.assigned_project_crew_id);

  -- If no crew member assigned, try to auto-assign from available crew
  if v_assigned_crew_id is null and v_task.assigned_project_role_id is not null then
    select pc.project_crew_id into v_assigned_crew_id
    from project_crew pc
    join project_roles pr on pr.role_id = pc.role_id and pr.project_id = pc.project_id
    where pr.project_role_id = v_task.assigned_project_role_id
    and pc.is_active = true
    order by pc.is_lead desc, pc.created_at
    limit 1;
  end if;

  -- Update task status
  update project_tasks
  set task_status = 'in_progress',
      assigned_project_crew_id = v_assigned_crew_id,
      started_at = now(),
      updated_by = v_updated_by
  where project_task_id = p_project_task_id;

end;
$$;

-- Function to complete a project task and trigger next tasks
create or replace function public.complete_project_task(
  p_project_task_id uuid
) returns void
language plpgsql
security definer
as $$
declare
  v_task record;
  v_updated_by text;
  v_next_task record;
begin
  -- Get current user
  select auth.email() into v_updated_by;

  -- Get task details
  select * into v_task
  from project_tasks
  where project_task_id = p_project_task_id;

  if not found then
    raise exception 'Task not found';
  end if;

  if v_task.task_status != 'in_progress' then
    raise exception 'Task is not in progress';
  end if;

  -- Update task status
  update project_tasks
  set task_status = 'completed',
      completed_at = now(),
      actual_hours = extract(epoch from (now() - started_at)) / 3600,
      updated_by = v_updated_by
  where project_task_id = p_project_task_id;

  -- Make child tasks ready
  update project_tasks
  set task_status = 'ready',
      updated_by = v_updated_by
  where parent_task_id = p_project_task_id
  and task_status = 'pending';

  -- If no child tasks, find and activate next sequential task
  if not exists (
    select 1 from project_tasks 
    where parent_task_id = p_project_task_id
  ) then
    -- Find next task in sequence
    for v_next_task in
      select pt.*
      from project_tasks pt
      where pt.project_id = v_task.project_id
      and pt.task_status = 'pending'
      and pt.parent_task_id is null
      and (
        -- Same phase, same step, next task
        (pt.phase_order = v_task.phase_order and pt.step_order = v_task.step_order and pt.task_order > v_task.task_order)
        or
        -- Same phase, next step
        (pt.phase_order = v_task.phase_order and pt.step_order > v_task.step_order)
        or
        -- Next phase
        (pt.phase_order > v_task.phase_order)
      )
      order by pt.phase_order, pt.step_order, pt.task_order
      limit 1
    loop
      -- Check if all previous tasks in the same step are completed
      if not exists (
        select 1 from project_tasks
        where project_id = v_next_task.project_id
        and phase_order = v_next_task.phase_order
        and step_order = v_next_task.step_order
        and task_order < v_next_task.task_order
        and task_status not in ('completed', 'cancelled')
      ) then
        update project_tasks
        set task_status = 'ready',
            updated_by = v_updated_by
        where project_task_id = v_next_task.project_task_id;
        
        -- Auto-assign to crew members if role has assigned crew
        if v_next_task.assigned_project_role_id is not null then
          perform auto_assign_ready_tasks(
            v_task.project_id,
            (select role_id from project_roles where project_role_id = v_next_task.assigned_project_role_id)
          );
        end if;
      end if;
    end loop;
  end if;

  -- Check if project should be marked as active
  update projects
  set project_status = 'active',
      updated_by = v_updated_by
  where project_id = v_task.project_id
  and project_status = 'planning'
  and exists (
    select 1 from project_tasks
    where project_id = v_task.project_id
    and task_status in ('in_progress', 'completed')
  );

  -- Check if project is completed
  if not exists (
    select 1 from project_tasks
    where project_id = v_task.project_id
    and task_status not in ('completed', 'cancelled')
    and is_archived = false
  ) then
    update projects
    set project_status = 'completed',
        project_end_date = current_date,
        updated_by = v_updated_by
    where project_id = v_task.project_id;
  end if;

end;
$$;

-- Grant permissions
grant execute on function public.create_project_from_template to authenticated;
grant execute on function public.auto_assign_ready_tasks to authenticated;
grant execute on function public.start_project_task to authenticated;
grant execute on function public.complete_project_task to authenticated;
