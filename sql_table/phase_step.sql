create table public.phase_steps (
  step_id uuid not null default gen_random_uuid (),
  phase_id uuid not null,
  step_name character varying(200) not null,
  description text null,
  step_order integer not null default 1,
  is_archived boolean not null default false,
  created_by character varying(255) not null,
  updated_by character varying(255) null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint phase_steps_pkey primary key (step_id),
  constraint phase_steps_phase_id_step_order_key unique (phase_id, step_order),
  constraint phase_steps_phase_id_fkey foreign KEY (phase_id) references template_phases (phase_id) on delete CASCADE,
  constraint phase_steps_description_check check ((char_length(description) <= 1000))
) TABLESPACE pg_default;

create index IF not exists idx_phase_steps_phase_id on public.phase_steps using btree (phase_id) TABLESPACE pg_default;

create index IF not exists idx_phase_steps_order on public.phase_steps using btree (step_order) TABLESPACE pg_default;

create index IF not exists idx_phase_steps_archived on public.phase_steps using btree (is_archived) TABLESPACE pg_default;

create index IF not exists idx_phase_steps_name on public.phase_steps using btree (step_name) TABLESPACE pg_default;

create trigger update_phase_steps_updated_at BEFORE
update on phase_steps for EACH row
execute FUNCTION update_updated_at_column ();