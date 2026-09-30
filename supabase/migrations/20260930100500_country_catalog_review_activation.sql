-- Human-reviewed Country Pack activation gate.

create table if not exists public.hb_country_catalog_reviews(
  id uuid primary key default gen_random_uuid(),
  country_pack_id uuid not null references public.hb_country_packs(id) on delete cascade,
  object_type text not null check(object_type in ('authority','policy_version','workflow','service_binding')),
  object_id uuid not null,
  outcome text not null check(outcome in ('approved','changes_required')),
  note text,
  reviewed_by uuid not null references auth.users(id) on delete restrict,
  reviewed_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists hb_country_catalog_reviews_object_idx
  on public.hb_country_catalog_reviews(country_pack_id,object_type,object_id,reviewed_at desc);
create index if not exists hb_country_catalog_reviews_reviewer_idx
  on public.hb_country_catalog_reviews(reviewed_by,reviewed_at desc);

alter table public.hb_country_catalog_reviews enable row level security;
drop policy if exists "backend only deny client access" on public.hb_country_catalog_reviews;
create policy "backend only deny client access"
on public.hb_country_catalog_reviews for all to public using(false) with check(false);
revoke all on public.hb_country_catalog_reviews from anon,authenticated;

create or replace function public.hb_owner_country_catalog_review_queue(p_limit integer default 100)
returns table(
  country_pack_id uuid,
  pack_key text,
  object_type text,
  object_id uuid,
  object_key text,
  object_title text,
  approved boolean,
  latest_outcome text,
  latest_reviewed_at timestamptz
)
language plpgsql
stable
security definer
set search_path=''
as $$
begin
  if (select auth.uid()) is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if not hb_private.is_platform_owner() then raise exception 'Platform owner access required' using errcode='42501'; end if;

  return query
  with objects as (
    select cp.id country_pack_id,cp.pack_key,'authority'::text object_type,a.id object_id,
      a.authority_key object_key,coalesce(a.name_ar,a.name_en) object_title
    from public.hb_country_packs cp
    join public.hb_authorities a on a.country_pack_id=cp.id
    where cp.status in ('draft','review')

    union all

    select cp.id,cp.pack_key,'policy_version',p.id,p.policy_key,
      p.policy_key||' v'||p.version::text
    from public.hb_country_packs cp
    join public.hb_policy_versions p on p.country_pack_id=cp.id
    where cp.status in ('draft','review') and p.status in ('draft','review')

    union all

    select cp.id,cp.pack_key,'workflow',w.id,w.workflow_key,
      coalesce(w.definition->>'name',w.workflow_key)||' v'||w.version::text
    from public.hb_country_packs cp
    join public.hb_workflow_templates w on w.country_pack_id=cp.id
    where cp.status in ('draft','review') and w.status in ('draft','review')

    union all

    select cp.id,cp.pack_key,'service_binding',b.id,b.service_slug,b.service_slug
    from public.hb_country_packs cp
    join public.hb_service_bindings b on b.country_pack_id=cp.id
    where cp.status in ('draft','review') and b.active=false
  ),
  enriched as (
    select o.*,
      lr.outcome as latest_outcome,
      lr.reviewed_at as latest_reviewed_at,
      coalesce(lr.outcome='approved',false) as approved
    from objects o
    left join lateral (
      select r.outcome,r.reviewed_at
      from public.hb_country_catalog_reviews r
      where r.country_pack_id=o.country_pack_id
        and r.object_type=o.object_type
        and r.object_id=o.object_id
      order by r.reviewed_at desc,r.id desc
      limit 1
    ) lr on true
  )
  select
    e.country_pack_id,e.pack_key,e.object_type,e.object_id,e.object_key,e.object_title,
    e.approved,e.latest_outcome,e.latest_reviewed_at
  from enriched e
  where not e.approved
  order by e.pack_key,
    case e.object_type
      when 'authority' then 1
      when 'policy_version' then 2
      when 'workflow' then 3
      when 'service_binding' then 4
      else 9 end,
    e.object_key
  limit least(greatest(coalesce(p_limit,100),1),200);
end;
$$;

create or replace function public.hb_owner_review_country_catalog_object(
  p_object_type text,
  p_object_id uuid,
  p_outcome text,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_pack_id uuid;
  v_pack_key text;
begin
  if v_uid is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if not hb_private.is_platform_owner() then raise exception 'Platform owner access required' using errcode='42501'; end if;
  if p_object_type not in ('authority','policy_version','workflow','service_binding') then
    raise exception 'Invalid catalog object type' using errcode='22023';
  end if;
  if p_outcome not in ('approved','changes_required') then
    raise exception 'Invalid catalog review outcome' using errcode='22023';
  end if;

  if p_object_type='authority' then
    select a.country_pack_id into v_pack_id from public.hb_authorities a where a.id=p_object_id;
  elsif p_object_type='policy_version' then
    select p.country_pack_id into v_pack_id from public.hb_policy_versions p where p.id=p_object_id;
  elsif p_object_type='workflow' then
    select w.country_pack_id into v_pack_id from public.hb_workflow_templates w where w.id=p_object_id;
  else
    select b.country_pack_id into v_pack_id from public.hb_service_bindings b where b.id=p_object_id;
  end if;

  if v_pack_id is null then raise exception 'Catalog object not found' using errcode='P0002'; end if;

  select cp.pack_key into v_pack_key
  from public.hb_country_packs cp
  where cp.id=v_pack_id and cp.status in ('draft','review');

  if v_pack_key is null then
    raise exception 'Catalog object is not in a reviewable Country Pack' using errcode='22023';
  end if;

  insert into public.hb_country_catalog_reviews(
    country_pack_id,object_type,object_id,outcome,note,reviewed_by,metadata
  )
  values(
    v_pack_id,p_object_type,p_object_id,p_outcome,
    nullif(left(btrim(coalesce(p_note,'')),1000),''),
    v_uid,jsonb_build_object('pack_key',v_pack_key)
  );

  if p_object_type='policy_version' and p_outcome='approved' then
    update public.hb_policy_versions
    set status='review',reviewed_by=v_uid::text,reviewed_at=now()
    where id=p_object_id and status='draft';
  elsif p_object_type='workflow' and p_outcome='approved' then
    update public.hb_workflow_templates
    set status='review'
    where id=p_object_id and status='draft';
  end if;

  return jsonb_build_object(
    'pack_key',v_pack_key,'object_type',p_object_type,'object_id',p_object_id,'outcome',p_outcome
  );
end;
$$;

create or replace function hb_private.country_pack_preflight(p_pack_id uuid)
returns jsonb
language sql
stable
security definer
set search_path=''
as $$
with pack as (
  select cp.*,j.code,j.active as jurisdiction_active
  from public.hb_country_packs cp
  join public.hb_jurisdictions j on j.id=cp.country_jurisdiction_id
  where cp.id=p_pack_id
),
catalog_objects as (
  select 'authority'::text object_type,a.id object_id
  from public.hb_authorities a where a.country_pack_id=p_pack_id

  union all
  select 'policy_version',p.id
  from public.hb_policy_versions p
  where p.country_pack_id=p_pack_id and p.status in ('draft','review','active')

  union all
  select 'workflow',w.id
  from public.hb_workflow_templates w
  where w.country_pack_id=p_pack_id and w.status in ('draft','review','active')

  union all
  select 'service_binding',b.id
  from public.hb_service_bindings b
  where b.country_pack_id=p_pack_id
),
m as (
  select
    (select count(*) from public.hb_authorities a where a.country_pack_id=p_pack_id) as authorities_total,
    (select count(*) from public.hb_policy_sources s where s.country_pack_id=p_pack_id and s.source_type='official') as sources_total,
    (select count(*) from public.hb_policy_sources s where s.country_pack_id=p_pack_id and s.source_type='official' and s.last_verified_at is null) as sources_unverified,
    (select count(*) from public.hb_policy_sources s where s.country_pack_id=p_pack_id and s.source_type='official' and s.review_required) as sources_review_required,
    (select count(*) from public.hb_policy_versions p where p.country_pack_id=p_pack_id and p.status in ('draft','review','active')) as policies_total,
    (select count(*) from public.hb_policy_versions p
      where p.country_pack_id=p_pack_id and p.status in ('draft','review','active')
        and (
          cardinality(p.source_ids)=0
          or exists(
            select 1 from unnest(p.source_ids) sid
            left join public.hb_policy_sources s on s.id=sid
            where s.id is null or s.country_pack_id<>p_pack_id or s.source_type<>'official'
               or s.last_verified_at is null or s.review_required
          )
        )
    ) as policies_with_source_issues,
    (select count(*) from public.hb_workflow_templates w
      where w.country_pack_id=p_pack_id and w.status in ('draft','review','active')) as workflows_total,
    (select count(*) from public.hb_workflow_templates w
      where w.country_pack_id=p_pack_id and w.status in ('draft','review','active')
        and (
          jsonb_typeof(w.definition)<>'object'
          or jsonb_typeof(w.definition->'steps')<>'array'
          or jsonb_array_length(coalesce(w.definition->'steps','[]'::jsonb))=0
        )
    ) as workflows_invalid,
    (select count(*) from public.hb_service_bindings b where b.country_pack_id=p_pack_id) as bindings_total,
    (select count(*) from public.hb_service_bindings b
      where b.country_pack_id=p_pack_id
        and (
          b.authority_id is null
          or not exists(select 1 from public.hb_authorities a where a.id=b.authority_id and a.country_pack_id=p_pack_id)
          or b.policy_key is null
          or not exists(select 1 from public.hb_policy_versions p where p.country_pack_id=p_pack_id and p.policy_key=b.policy_key and p.status in ('draft','review','active'))
          or b.workflow_key is null
          or not exists(select 1 from public.hb_workflow_templates w where w.country_pack_id=p_pack_id and w.workflow_key=b.workflow_key and w.status in ('draft','review','active'))
        )
    ) as bindings_with_reference_issues,
    (select count(*) from public.hb_service_bindings b
      where b.country_pack_id=p_pack_id
        and exists(
          select 1 from public.hb_service_bindings other
          where other.country_pack_id<>p_pack_id and other.active=true and other.service_slug=b.service_slug
        )
    ) as cross_country_slug_conflicts,
    (select count(*) from catalog_objects) as catalog_objects_total,
    (select count(*)
      from catalog_objects o
      where coalesce((
        select r.outcome='approved'
        from public.hb_country_catalog_reviews r
        where r.country_pack_id=p_pack_id and r.object_type=o.object_type and r.object_id=o.object_id
        order by r.reviewed_at desc,r.id desc limit 1
      ),false)=false
    ) as catalog_objects_pending_review
)
select jsonb_build_object(
  'pack_id',pack.id,
  'pack_key',pack.pack_key,
  'country_code',pack.code,
  'status',pack.status,
  'generated_at',now(),
  'metrics',jsonb_build_object(
    'authorities_total',m.authorities_total,
    'sources_total',m.sources_total,
    'sources_unverified',m.sources_unverified,
    'sources_review_required',m.sources_review_required,
    'policies_total',m.policies_total,
    'policies_with_source_issues',m.policies_with_source_issues,
    'workflows_total',m.workflows_total,
    'workflows_invalid',m.workflows_invalid,
    'bindings_total',m.bindings_total,
    'bindings_with_reference_issues',m.bindings_with_reference_issues,
    'cross_country_slug_conflicts',m.cross_country_slug_conflicts,
    'catalog_objects_total',m.catalog_objects_total,
    'catalog_objects_pending_review',m.catalog_objects_pending_review
  ),
  'ready_to_activate',
    pack.status in ('draft','review')
    and pack.jurisdiction_active
    and m.authorities_total>0
    and m.sources_total>0
    and m.sources_unverified=0
    and m.sources_review_required=0
    and m.policies_total>0
    and m.policies_with_source_issues=0
    and m.workflows_total>0
    and m.workflows_invalid=0
    and m.bindings_total>0
    and m.bindings_with_reference_issues=0
    and m.cross_country_slug_conflicts=0
    and m.catalog_objects_total>0
    and m.catalog_objects_pending_review=0
)
from pack,m;
$$;

create or replace function public.hb_owner_country_pack_preflight(p_pack_key text)
returns jsonb
language plpgsql
stable
security definer
set search_path=''
as $$
declare
  v_pack_id uuid;
begin
  if (select auth.uid()) is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if not hb_private.is_platform_owner() then raise exception 'Platform owner access required' using errcode='42501'; end if;

  select cp.id into v_pack_id
  from public.hb_country_packs cp
  where cp.pack_key=btrim(p_pack_key)
  order by cp.version desc limit 1;

  if v_pack_id is null then raise exception 'Country pack not found' using errcode='P0002'; end if;
  return hb_private.country_pack_preflight(v_pack_id);
end;
$$;

create or replace function public.hb_owner_country_pack_health()
returns setof jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_row record;
  v_health jsonb;
  v_preflight jsonb;
begin
  if (select auth.uid()) is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if not hb_private.is_platform_owner() then raise exception 'Platform owner access required' using errcode='42501'; end if;

  for v_row in
    select cp.id,cp.status
    from public.hb_country_packs cp
    order by cp.pack_key,cp.version desc
  loop
    v_health:=hb_private.country_pack_health(v_row.id);
    v_preflight:=case
      when v_row.status in ('draft','review') then hb_private.country_pack_preflight(v_row.id)
      else null
    end;
    return next v_health || jsonb_build_object('preflight',v_preflight);
  end loop;
  return;
end;
$$;

create or replace function public.hb_owner_activate_country_pack(p_pack_key text)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_pack public.hb_country_packs%rowtype;
  v_preflight jsonb;
begin
  if v_uid is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if not hb_private.is_platform_owner() then raise exception 'Platform owner access required' using errcode='42501'; end if;

  select * into v_pack
  from public.hb_country_packs
  where pack_key=btrim(p_pack_key)
  order by version desc limit 1
  for update;

  if not found then raise exception 'Country pack not found' using errcode='P0002'; end if;
  if v_pack.status not in ('draft','review') then
    raise exception 'Only draft/review Country Packs can be activated' using errcode='22023';
  end if;

  v_preflight:=hb_private.country_pack_preflight(v_pack.id);
  if coalesce((v_preflight->>'ready_to_activate')::boolean,false) is not true then
    raise exception 'Country Pack preflight failed' using errcode='22023';
  end if;

  update public.hb_authorities set active=true,updated_at=now() where country_pack_id=v_pack.id;

  update public.hb_policy_sources
  set active=true,
      monitor_enabled=case when metadata->>'monitor_mode'='manual' then false else true end,
      monitor_locked_at=null,
      monitor_failures=0,
      monitor_error=null
  where country_pack_id=v_pack.id and source_type='official';

  update public.hb_policy_versions p
  set status=case when p.version=latest.max_version then 'active' else 'retired' end,
      reviewed_by=v_uid::text,
      reviewed_at=now()
  from (
    select policy_key,max(version) as max_version
    from public.hb_policy_versions
    where country_pack_id=v_pack.id and status in ('draft','review','active')
    group by policy_key
  ) latest
  where p.country_pack_id=v_pack.id
    and p.policy_key=latest.policy_key
    and p.status in ('draft','review','active');

  update public.hb_workflow_templates w
  set status=case when w.version=latest.max_version then 'active' else 'retired' end
  from (
    select workflow_key,max(version) as max_version
    from public.hb_workflow_templates
    where country_pack_id=v_pack.id and status in ('draft','review','active')
    group by workflow_key
  ) latest
  where w.country_pack_id=v_pack.id
    and w.workflow_key=latest.workflow_key
    and w.status in ('draft','review','active');

  update public.hb_service_bindings
  set active=true,
      metadata=metadata || jsonb_build_object(
        'country_pack_activated_at',now(),
        'country_pack_activated_by',v_uid
      )
  where country_pack_id=v_pack.id;

  update public.hb_country_packs
  set capabilities=capabilities || jsonb_build_object(
        'service_catalog',true,
        'policy_engine',true,
        'workflow_engine',true,
        'source_verification',true
      ),
      metadata=metadata || jsonb_build_object(
        'onboarding_state','activation_preflight_passed',
        'activation_requested_by',v_uid,
        'activation_requested_at',now()
      )
  where id=v_pack.id;

  update public.hb_country_packs set status='active' where id=v_pack.id;

  return jsonb_build_object(
    'pack_key',v_pack.pack_key,
    'pack_id',v_pack.id,
    'status','active',
    'preflight',v_preflight,
    'health',hb_private.country_pack_health(v_pack.id)
  );
end;
$$;

revoke all on function public.hb_owner_country_catalog_review_queue(integer) from public,anon;
grant execute on function public.hb_owner_country_catalog_review_queue(integer) to authenticated;
revoke all on function public.hb_owner_review_country_catalog_object(text,uuid,text,text) from public,anon;
grant execute on function public.hb_owner_review_country_catalog_object(text,uuid,text,text) to authenticated;
revoke all on function hb_private.country_pack_preflight(uuid) from public,anon,authenticated;
revoke all on function public.hb_owner_country_pack_preflight(text) from public,anon;
grant execute on function public.hb_owner_country_pack_preflight(text) to authenticated;
revoke all on function public.hb_owner_activate_country_pack(text) from public,anon;
grant execute on function public.hb_owner_activate_country_pack(text) to authenticated;
