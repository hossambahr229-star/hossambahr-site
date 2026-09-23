-- The owner's verified mailbox is provisioned privately in production.
-- Do not store the owner email or passwords in this public repository.
create schema if not exists hb_private;
revoke all on schema hb_private from public, anon, authenticated;
create table if not exists hb_private.platform_owner_allowlist (
 email text primary key check (email = lower(btrim(email)) and char_length(email) between 3 and 320),
 created_at timestamptz not null default now()
);
revoke all on hb_private.platform_owner_allowlist from public, anon, authenticated;
alter table hb_private.platform_owner_allowlist enable row level security;
create or replace function public.hb_is_platform_owner()
returns boolean language sql stable security definer set search_path = ''
as $$
 select coalesce(exists (
 select 1 from auth.users u
 join hb_private.platform_owner_allowlist a on a.email = lower(u.email)
 where u.id = (select auth.uid()) and u.email_confirmed_at is not null
 and u.deleted_at is null and (u.banned_until is null or u.banned_until < now())
 ),false)
$$;
revoke all on function public.hb_is_platform_owner() from public, anon;
grant execute on function public.hb_is_platform_owner() to authenticated;
create or replace function public.hb_owner_overview()
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
begin
 if not public.hb_is_platform_owner() then raise exception 'Permission denied' using errcode = '42501'; end if;
 return jsonb_build_object(
 'users',(select count(*) from auth.users where deleted_at is null),
 'verified_users',(select count(*) from auth.users where deleted_at is null and email_confirmed_at is not null),
 'transactions',(select count(*) from public.user_transactions),
 'organizations',(select count(*) from public.hb_organizations),
 'cases',(select count(*) from public.hb_cases));
end;
$$;
revoke all on function public.hb_owner_overview() from public, anon;
grant execute on function public.hb_owner_overview() to authenticated;
create or replace function public.hb_owner_recent_transactions(p_limit integer default 25)
returns table(transaction_id uuid, service_name text, status text, created_at timestamptz)
language plpgsql stable security definer set search_path = ''
as $$
begin
 if not public.hb_is_platform_owner() then raise exception 'Permission denied' using errcode = '42501'; end if;
 return query select t.id,t.service_name,t.status,t.created_at from public.user_transactions t
 order by t.created_at desc limit least(greatest(coalesce(p_limit,25),1),50);
end;
$$;
revoke all on function public.hb_owner_recent_transactions(integer) from public, anon;
grant execute on function public.hb_owner_recent_transactions(integer) to authenticated;
