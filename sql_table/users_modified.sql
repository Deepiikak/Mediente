-- Modified Users table - global identity without project-specific role/department constraints
-- This represents the global identity of a person across all projects

-- First, create a backup of existing data if needed
-- create table users_backup as select * from users;

-- Drop the existing role constraint
alter table public.users drop constraint if exists users_role_check;

-- Modify the users table structure
alter table public.users 
  -- Make role and department nullable since they're now project-specific
  alter column role drop not null,
  alter column department drop not null;

-- Add new columns for better global identity management
alter table public.users 
  add column if not exists first_name character varying(100),
  add column if not exists last_name character varying(100),
  add column if not exists phone character varying(20),
  add column if not exists emergency_contact_name character varying(100),
  add column if not exists emergency_contact_phone character varying(20),
  add column if not exists address text,
  add column if not exists notes text,
  add column if not exists hire_date date,
  add column if not exists employment_status character varying(50) default 'active';

-- Add constraints for new fields
alter table public.users 
  add constraint users_phone_check check ((char_length(phone) >= 10)),
  add constraint users_address_check check ((char_length(address) <= 500)),
  add constraint users_notes_check check ((char_length(notes) <= 1000)),
  add constraint users_employment_status_check check (
    employment_status in ('active', 'inactive', 'terminated', 'on_leave')
  );

-- Update the table comment
comment on table public.users is 'Global user identity - stores personal information that persists across all projects';
comment on column public.users.role is 'Legacy field - roles are now project-specific in project_crew table';
comment on column public.users.department is 'Legacy field - departments are now project-specific in project_crew table';
comment on column public.users.employment_status is 'Overall employment status with the organization';

-- Create indexes for new fields
create index if not exists idx_users_first_name on public.users using btree (first_name) tablespace pg_default;
create index if not exists idx_users_last_name on public.users using btree (last_name) tablespace pg_default;
create index if not exists idx_users_phone on public.users using btree (phone) tablespace pg_default;
create index if not exists idx_users_employment_status on public.users using btree (employment_status) tablespace pg_default;
create index if not exists idx_users_hire_date on public.users using btree (hire_date) tablespace pg_default;
