-- Country Pack case routing and activation health.
-- Production-safe, idempotent migration for multi-country HOSSAM BAHR OS.

alter table public.hb_cases
  add column if not exists country_pack_id uuid
  references public.hb_country_packs(id) on delete restrict;

create index if not exists hb_cases_country_pack_idx
  on public.hb_cases(country_pack_id,created_at desc);

create index if not exists hb_authorities_jurisdiction_idx
  on public.hb_authorities(jurisdiction_id);

create index if not exists hb_service_bindings_country_pack_active_idx
  on public.hb_service_bindings(country_pack_id,active);

update public.hb_cases c
set country_pack_id=b.country_pack_id
from public.hb_service_bindings b
where c.country_pack_id is null
  and c.service_slug=b.service_slug
  and b.active=true
  and b.country_pack_id is not null;

create or replace function hb_private.resolve_country_pack_for_case(
  p_service_slug text,
  p_jurisdiction_id uuid
)
returns uuid
language plpgsql
stable
security definer
set search_path=''
as $$
declare
  v_pack_id uuid;
  v_country_jurisdiction uuid;
begin
  if nullif(btrim(coalesce(p_service_slug,'')),'') is not null then
    select b.country_pack_id into v_pack_id
    from public.hb_service_bindings b
    join public.hb_country_packs cp on cp.id=b.country_pack_id
    where b.service_slug=p_service_slug
      and b.active=true
      and cp.status='active'
    order by b.id
    limit 1;
    if v_pack_id is not null then return v_pack_id; end if;
  end if;

  if p_jurisdiction_id is not null then
    with recursive chain as (
      select j.id,j.parent_id,j.level
      from public.hb_jurisdictions j
      where j.id=p_jurisdiction_id
      union all
      select p.id,p.parent_id,p.level
      from public.hb_jurisdictions p
      join chain c on c.parent_id=p.id
    )
    select id into v_country_jurisdiction
    from chain
    where level='country'
    limit 1;

    if v_country_jurisdiction is not null then
      select cp.id into v_pack_id
      from public.hb_country_packs cp
      where cp.country_jurisdiction_id=v_country_jurisdiction
        and cp.status='active'
      order by cp.version desc
      limit 1;
    end if;
  end if;

  return v_pack_id;
end;
$$;

create or replace function hb_private.assign_case_country_pack()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
begin
  if new.country_pack_id is null
     or tg_op='INSERT'
     or new.service_slug is distinct from old.service_slug
     or new.jurisdiction_id is distinct from old.jurisdiction_id
  then
    new.country_pack_id:=coalesce(
      hb_private.resolve_country_pack_for_case(new.service_slug,new.jurisdiction_id),
      new.country_pack_id
    );
  end if;
  return new;
end;
$$;

drop trigger if exists hb_case_assign_country_pack on public.hb_cases;
create trigger hb_case_assign_country_pack
before insert or update of service_slug,jurisdiction_id,country_pack_id
on public.hb_cases
for each row execute function hb_private.assign_case_country_pack();

create or replace function hb_private.country_pack_health(p_pack_id uuid)
returns jsonb
language sql
stable
security definer
set search_path=''
as $$
with pack as (
  select cp.*,j.code,j.name_ar,j.name_en,j.active as jurisdiction_active,j.level
  from public.hb_country_packs cp
  join public.hb_jurisdictions j on j.id=cp.country_jurisdiction_id
  where cp.id=p_pack_id
),
bindings as (
  select b.*
  from public.hb_service_bindings b
  where b.country_pack_id=p_pack_id and b.active=true
),
metrics as (
  select
    (select count(*) from public.hb_authorities a where a.country_pack_id=p_pack_id and a.active=true) as authorities_active,
    (select count(*) from bindings) as services_active,
    (select count(*) from bindings b where b.authority_id is null) as services_without_authority,
    (select count(*) from bindings b where b.policy_key is null) as services_without_policy,
    (select count(*) from bindings b where b.workflow_key is null) as services_without_workflow,
    (select count(*) from bindings b where not exists(
      select 1 from public.hb_policy_versions p
      where p.policy_key=b.policy_key and p.status='active'
        and (p.effective_until is null or p.effective_until>now())
    )) as services_without_active_policy,
    (select count(*) from bindings b where not exists(
      select 1 from public.hb_workflow_templates w
      where w.workflow_key=b.workflow_key and w.status='active'
        and (w.effective_until is null or w.effective_until>now())
    )) as services_without_active_workflow
)
select jsonb_build_object(
  'pack_id',pack.id,
  'pack_key',pack.pack_key,
  'country_code',pack.code,
  'status',pack.status,
  'version',pack.version,
  'generated_at',now(),
  'metrics',jsonb_build_object(
    'authorities_active',metrics.authorities_active,
    'services_active',metrics.services_active,
    'services_without_authority',metrics.services_without_authority,
    'services_without_policy',metrics.services_without_policy,
    'services_without_workflow',metrics.services_without_workflow,
    'services_without_active_policy',metrics.services_without_active_policy,
    'services_without_active_workflow',metrics.services_without_active_workflow
  ),
  'ready_for_activation',
    pack.jurisdiction_active
    and pack.level='country'
    and metrics.authorities_active>0
    and metrics.services_active>0
    and metrics.services_without_authority=0
    and metrics.services_without_policy=0
    and metrics.services_without_workflow=0
    and metrics.services_without_active_policy=0
    and metrics.services_without_active_workflow=0
)
from pack,metrics;
$$;

create or replace function hb_private.guard_country_pack_activation()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  v_health jsonb;
begin
  if new.status='active' and (tg_op='INSERT' or old.status is distinct from 'active') then
    if new.id is null then new.id:=gen_random_uuid(); end if;

    if not exists(
      select 1 from public.hb_jurisdictions j
      where j.id=new.country_jurisdiction_id
        and j.level='country'
        and j.active=true
    ) then
      raise exception 'Country pack requires an active country jurisdiction' using errcode='22023';
    end if;

    if tg_op='INSERT' then
      raise exception 'Create country pack in draft/review, load authorities/services/policies/workflows, then activate it'
        using errcode='22023';
    end if;

    v_health:=hb_private.country_pack_health(new.id);
    if coalesce((v_health->>'ready_for_activation')::boolean,false) is not true then
      raise exception 'Country pack is not activation-ready' using errcode='22023';
    end if;

    new.activated_at:=coalesce(new.activated_at,now());
  end if;
  return new;
end;
$$;

drop trigger if exists hb_country_pack_activation_guard on public.hb_country_packs;
create trigger hb_country_pack_activation_guard
before insert or update of status
on public.hb_country_packs
for each row execute function hb_private.guard_country_pack_activation();

create or replace function public.hb_active_country_packs()
returns table(
  pack_key text,
  country_code text,
  name_ar text,
  name_en text,
  default_locale text,
  default_currency text,
  supported_languages text[],
  capabilities jsonb,
  version integer
)
language sql
stable
security invoker
set search_path=''
as $$
  select
    cp.pack_key,
    j.code,
    j.name_ar,
    j.name_en,
    cp.default_locale,
    cp.default_currency,
    cp.supported_languages,
    cp.capabilities,
    cp.version
  from public.hb_country_packs cp
  join public.hb_jurisdictions j on j.id=cp.country_jurisdiction_id
  where cp.status='active' and j.active=true
  order by j.name_en,cp.version desc
$$;

create or replace function public.hb_start_case_v2(
  p_goal text,
  p_title text default null,
  p_service_slug text default null,
  p_organization_id uuid default null,
  p_country_pack_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_result jsonb;
  v_case_id uuid;
  v_requested_pack_id uuid;
  v_requested_country_jurisdiction_id uuid;
  v_existing_pack_id uuid;
begin
  if v_uid is null then
    raise exception 'Authentication required' using errcode='42501';
  end if;

  if nullif(btrim(coalesce(p_country_pack_key,'')),'') is not null then
    select cp.id,cp.country_jurisdiction_id
      into v_requested_pack_id,v_requested_country_jurisdiction_id
    from public.hb_country_packs cp
    join public.hb_jurisdictions j on j.id=cp.country_jurisdiction_id
    where cp.pack_key=p_country_pack_key
      and cp.status='active'
      and j.active=true
      and j.level='country'
    order by cp.version desc
    limit 1;

    if v_requested_pack_id is null then
      raise exception 'Country pack is not active' using errcode='22023';
    end if;
  end if;

  v_result:=hb_private.start_case(p_goal,p_title,p_service_slug,p_organization_id);
  v_case_id:=(v_result->>'id')::uuid;

  select c.country_pack_id into v_existing_pack_id
  from public.hb_cases c
  where c.id=v_case_id and c.user_id=v_uid
  for update;

  if v_requested_pack_id is not null
     and v_existing_pack_id is not null
     and v_existing_pack_id<>v_requested_pack_id
  then
    raise exception 'Selected country conflicts with the selected service' using errcode='22023';
  end if;

  if v_requested_pack_id is not null and v_existing_pack_id is null then
    update public.hb_cases
    set country_pack_id=v_requested_pack_id,
        jurisdiction_id=coalesce(jurisdiction_id,v_requested_country_jurisdiction_id),
        metadata=metadata || jsonb_build_object('country_pack_key',p_country_pack_key),
        updated_at=now()
    where id=v_case_id and user_id=v_uid;
  end if;

  return v_result || jsonb_build_object(
    'country_pack_id',coalesce(v_existing_pack_id,v_requested_pack_id),
    'country_pack_key',case
      when coalesce(v_existing_pack_id,v_requested_pack_id) is null then null
      else (
        select cp.pack_key
        from public.hb_country_packs cp
        where cp.id=coalesce(v_existing_pack_id,v_requested_pack_id)
      )
    end
  );
end;
$$;

create or replace function public.hb_owner_country_pack_health()
returns setof jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_row record;
begin
  if v_uid is null then
    raise exception 'Authentication required' using errcode='42501';
  end if;

  if not hb_private.is_platform_owner() then
    raise exception 'Platform owner access required' using errcode='42501';
  end if;

  for v_row in
    select cp.id
    from public.hb_country_packs cp
    order by cp.pack_key,cp.version desc
  loop
    return next hb_private.country_pack_health(v_row.id);
  end loop;
  return;
end;
$$;

revoke all on function hb_private.resolve_country_pack_for_case(text,uuid) from public,anon,authenticated;
revoke all on function hb_private.country_pack_health(uuid) from public,anon,authenticated;

revoke insert,update,delete,truncate,references,trigger
on public.hb_jurisdictions
from anon,authenticated;

grant select on public.hb_jurisdictions to anon,authenticated;
grant select on public.hb_country_packs to anon,authenticated;
grant execute on function public.hb_active_country_packs() to anon,authenticated;

revoke all on function public.hb_start_case_v2(text,text,text,uuid,text) from public,anon;
grant execute on function public.hb_start_case_v2(text,text,text,uuid,text) to authenticated;

revoke all on function public.hb_owner_country_pack_health() from public,anon;
grant execute on function public.hb_owner_country_pack_health() to authenticated;
