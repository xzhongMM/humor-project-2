-- Run in the Supabase dashboard → SQL Editor (runs as postgres, so RLS doesn't apply).
-- This is the out-of-band fix for "won't I lock myself out?".
-- Sign in to the app with Google ONCE first so your auth.users + profiles rows exist.

-- 1) Make sure the flag exists and defaults to FALSE (fail closed).
alter table public.profiles
  add column if not exists is_superadmin boolean not null default false;

-- 2) Promote yourself (email is looked up in auth.users, not stored on profiles).
update public.profiles p
set    is_superadmin = true
from   auth.users u
where  u.id = p.id
and    lower(u.email) = lower('you@gmail.com');

-- 3) Verify.
select p.id, u.email, p.is_superadmin
from   public.profiles p
join   auth.users u on u.id = p.id
where  p.is_superadmin;

-- 4) STRONGLY RECOMMENDED: make sure regular users can't promote themselves
--    through the public API. If you have an RLS policy that lets users update
--    their own profile row, this trigger stops them from touching is_superadmin.
create or replace function public.protect_superadmin_flag()
returns trigger language plpgsql as $$
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
end $$;

drop trigger if exists protect_superadmin_flag on public.profiles;
create trigger protect_superadmin_flag
  before insert or update on public.profiles
  for each row execute function public.protect_superadmin_flag();
