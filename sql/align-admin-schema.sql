-- Run in Supabase SQL Editor as postgres before using the admin dashboard.
-- Existing table and column names are preserved. Only the authorization flag
-- required by the admin login wall is added to profiles.

alter table public.profiles
  add column if not exists is_superadmin boolean not null default false;

-- Prevent authenticated users from setting the flag on insert or update.
create or replace function public.protect_superadmin_flag()
returns trigger
language plpgsql
as $$
begin
  if current_user not in ('postgres', 'supabase_admin', 'service_role') then
    if tg_op = 'INSERT' and new.is_superadmin then
      raise exception 'is_superadmin can only be set by an administrator';
    end if;
    if tg_op = 'UPDATE' and new.is_superadmin is distinct from old.is_superadmin then
      raise exception 'is_superadmin can only be changed by an administrator';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_superadmin_flag on public.profiles;
create trigger protect_superadmin_flag
  before insert or update on public.profiles
  for each row execute function public.protect_superadmin_flag();