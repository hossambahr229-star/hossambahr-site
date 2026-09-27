-- Move privileged membership/role checks out of the exposed public schema.
create schema if not exists hb_private;
revoke all on schema hb_private from public, anon;
grant usage on schema hb_private to authenticated;

create or replace function hb_private.is_org_member(target_org uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1 from public.hb_organization_members m
      where m.organization_id = target_org and m.user_id = (select auth.uid())
    );
$$;

create or replace function hb_private.has_org_role(target_org uuid, allowed_roles text[])
returns boolean language sql stable security definer set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1 from public.hb_organization_members m
      where m.organization_id = target_org
        and m.user_id = (select auth.uid())
        and m.role = any(allowed_roles)
    );
$$;

create or replace function hb_private.is_tenant_member(target_tenant uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1 from public.hb_tenant_members m
      where m.tenant_id = target_tenant and m.user_id = (select auth.uid())
    );
$$;

create or replace function hb_private.has_tenant_role(target_tenant uuid, allowed_roles text[])
returns boolean language sql stable security definer set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1 from public.hb_tenant_members m
      where m.tenant_id = target_tenant
        and m.user_id = (select auth.uid())
        and m.role = any(allowed_roles)
    );
$$;

revoke all on function hb_private.is_org_member(uuid) from public, anon;
revoke all on function hb_private.has_org_role(uuid,text[]) from public, anon;
revoke all on function hb_private.is_tenant_member(uuid) from public, anon;
revoke all on function hb_private.has_tenant_role(uuid,text[]) from public, anon;
grant execute on function hb_private.is_org_member(uuid) to authenticated;
grant execute on function hb_private.has_org_role(uuid,text[]) to authenticated;
grant execute on function hb_private.is_tenant_member(uuid) to authenticated;
grant execute on function hb_private.has_tenant_role(uuid,text[]) to authenticated;

create or replace function public.hb_is_org_member(target_org uuid)
returns boolean language sql stable security invoker set search_path = ''
as $$ select hb_private.is_org_member(target_org) $$;
create or replace function public.hb_has_org_role(target_org uuid, allowed_roles text[])
returns boolean language sql stable security invoker set search_path = ''
as $$ select hb_private.has_org_role(target_org, allowed_roles) $$;
create or replace function public.hb_is_tenant_member(target_tenant uuid)
returns boolean language sql stable security invoker set search_path = ''
as $$ select hb_private.is_tenant_member(target_tenant) $$;
create or replace function public.hb_has_tenant_role(target_tenant uuid, allowed_roles text[])
returns boolean language sql stable security invoker set search_path = ''
as $$ select hb_private.has_tenant_role(target_tenant, allowed_roles) $$;

revoke all on function public.hb_is_org_member(uuid) from public, anon;
revoke all on function public.hb_has_org_role(uuid,text[]) from public, anon;
revoke all on function public.hb_is_tenant_member(uuid) from public, anon;
revoke all on function public.hb_has_tenant_role(uuid,text[]) from public, anon;
grant execute on function public.hb_is_org_member(uuid) to authenticated;
grant execute on function public.hb_has_org_role(uuid,text[]) to authenticated;
grant execute on function public.hb_is_tenant_member(uuid) to authenticated;
grant execute on function public.hb_has_tenant_role(uuid,text[]) to authenticated;
