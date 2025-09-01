create table public.step_tasks (
  task_id uuid not null default gen_random_uuid (),
  step_id uuid not null,
  task_name character varying(200) not null,
  description text null,
  task_order integer not null default 1,
  estimated_hours integer null,
  is_archived boolean not null default false,
  created_by character varying(255) not null,
  updated_by character varying(255) null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  assigned_role_id uuid null,
  parent_task_id uuid null,
  category public.task_category_type null,
  checklist_items jsonb null default '[]'::jsonb,
  constraint step_tasks_pkey primary key (task_id),
  constraint step_tasks_step_id_task_order_key unique (step_id, task_order),
  constraint step_tasks_assigned_role_id_fkey foreign KEY (assigned_role_id) references department_roles (role_id) on delete set null,
  constraint step_tasks_parent_task_id_fkey foreign KEY (parent_task_id) references step_tasks (task_id) on delete CASCADE,
  constraint step_tasks_step_id_fkey foreign KEY (step_id) references phase_steps (step_id) on delete CASCADE,
  constraint step_tasks_checklist_items_is_array check ((jsonb_typeof(checklist_items) = 'array'::text)),
  constraint step_tasks_checklist_items_valid_structure check (validate_checklist_items_array (checklist_items)),
  constraint step_tasks_description_check check ((char_length(description) <= 1000)),
  constraint step_tasks_estimated_hours_check check ((estimated_hours >= 0))
) TABLESPACE pg_default;

create index IF not exists idx_step_tasks_step_id on public.step_tasks using btree (step_id) TABLESPACE pg_default;

create index IF not exists idx_step_tasks_order on public.step_tasks using btree (task_order) TABLESPACE pg_default;

create index IF not exists idx_step_tasks_archived on public.step_tasks using btree (is_archived) TABLESPACE pg_default;

create index IF not exists idx_step_tasks_name on public.step_tasks using btree (task_name) TABLESPACE pg_default;

create index IF not exists idx_step_tasks_estimated_hours on public.step_tasks using btree (estimated_hours) TABLESPACE pg_default;

create index IF not exists idx_step_tasks_parent_task_id on public.step_tasks using btree (parent_task_id) TABLESPACE pg_default;

create index IF not exists idx_step_tasks_step_parent on public.step_tasks using btree (step_id, parent_task_id) TABLESPACE pg_default;

create index IF not exists idx_step_tasks_category on public.step_tasks using btree (category) TABLESPACE pg_default;

create index IF not exists idx_step_tasks_step_category on public.step_tasks using btree (step_id, category) TABLESPACE pg_default;

create index IF not exists idx_step_tasks_checklist_items on public.step_tasks using gin (checklist_items) TABLESPACE pg_default;

create index IF not exists idx_step_tasks_assigned_role on public.step_tasks using btree (assigned_role_id) TABLESPACE pg_default;

create index IF not exists idx_step_tasks_role_archived on public.step_tasks using btree (assigned_role_id, is_archived) TABLESPACE pg_default
where
  (assigned_role_id is not null);

create trigger check_task_circular_hierarchy_trigger BEFORE INSERT
or
update on step_tasks for EACH row
execute FUNCTION check_task_circular_hierarchy ();

create trigger update_step_tasks_updated_at BEFORE
update on step_tasks for EACH row
execute FUNCTION update_updated_at_column ();