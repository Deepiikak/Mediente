create table public.template_phases (
  phase_id uuid not null default gen_random_uuid (),
  template_id uuid not null,
  phase_name character varying(200) not null,
  description text null,
  phase_order integer not null default 1,
  is_archived boolean not null default false,
  created_by character varying(255) not null,
  updated_by character varying(255) null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint template_phases_pkey primary key (phase_id),
  constraint template_phases_template_id_phase_order_key unique (template_id, phase_order),
  constraint template_phases_template_id_fkey foreign KEY (template_id) references project_templates (template_id) on delete CASCADE,
  constraint template_phases_description_check check ((char_length(description) <= 1000))
) TABLESPACE pg_default;

create index IF not exists idx_template_phases_template_id on public.template_phases using btree (template_id) TABLESPACE pg_default;

create index IF not exists idx_template_phases_order on public.template_phases using btree (phase_order) TABLESPACE pg_default;

create index IF not exists idx_template_phases_archived on public.template_phases using btree (is_archived) TABLESPACE pg_default;

create index IF not exists idx_template_phases_name on public.template_phases using btree (phase_name) TABLESPACE pg_default;

create trigger update_template_phases_updated_at BEFORE
update on template_phases for EACH row
execute FUNCTION update_updated_at_column ();