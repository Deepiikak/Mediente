create table public.project_templates (
  template_id uuid not null default gen_random_uuid (),
  template_name character varying(200) not null,
  description text null,
  is_archived boolean not null default false,
  created_by character varying(255) not null,
  updated_by character varying(255) null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint project_templates_pkey primary key (template_id),
  constraint project_templates_description_check check ((char_length(description) <= 1000))
) TABLESPACE pg_default;

create index IF not exists idx_project_templates_name on public.project_templates using btree (template_name) TABLESPACE pg_default;

create index IF not exists idx_project_templates_archived on public.project_templates using btree (is_archived) TABLESPACE pg_default;

create index IF not exists idx_project_templates_created_at on public.project_templates using btree (created_at) TABLESPACE pg_default;

create trigger update_project_templates_updated_at BEFORE
update on project_templates for EACH row
execute FUNCTION update_updated_at_column ();