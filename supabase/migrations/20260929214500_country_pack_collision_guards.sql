-- Multi-country collision guards.

create unique index if not exists hb_country_packs_one_active_version_idx
  on public.hb_country_packs(pack_key)
  where status='active';

create or replace function hb_private.guard_service_binding_country_collision()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
begin
  if coalesce(new.active,false) and exists(
    select 1
    from public.hb_service_bindings b
    where b.service_slug=new.service_slug
      and b.active=true
      and b.country_pack_id<>new.country_pack_id
      and b.id<>new.id
  ) then
    raise exception 'Active service slug conflicts across country packs; use a country-scoped slug'
      using errcode='23505';
  end if;
  return new;
end;
$$;

drop trigger if exists hb_service_binding_country_collision_guard
on public.hb_service_bindings;

create trigger hb_service_binding_country_collision_guard
before insert or update of service_slug,country_pack_id,active
on public.hb_service_bindings
for each row execute function hb_private.guard_service_binding_country_collision();

revoke all on function hb_private.guard_service_binding_country_collision()
from public,anon,authenticated;
