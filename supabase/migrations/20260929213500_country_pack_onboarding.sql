-- Country Pack onboarding safety gates.
-- Requires active official policy sources before activation and exposes draft-only owner onboarding.

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
active_policies as (
  select distinct p.id,p.policy_key,p.source_ids
  from public.hb_policy_versions p
  join bindings b on b.policy_key=p.policy_key
  where p.country_pack_id=p_pack_id
    and p.status='active'
    and (p.effective_until is null or p.effective_until>now())
),
metrics as (
  select
    (select count(*) from public.hb_authorities a where a.country_pack_id=p_pack_id and a.active=true) as authorities_active,
    (select count(*) from bindings) as services_active,
    (select count(*) from public.hb_policy_sources s where s.country_pack_id=p_pack_id and s.active=true and s.source_type='official') as official_sources_active,
    (select count(*) from public.hb_policy_sources s where s.country_pack_id=p_pack_id and s.active=true and s.source_type='official' and s.last_verified_at is not null) as official_sources_verified,
    (select min(s.last_verified_at) from public.hb_policy_sources s where s.country_pack_id=p_pack_id and s.active=true and s.source_type='official') as oldest_source_verification,
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
    )) as services_without_active_workflow,
    (select count(*) from active_policies p where
      cardinality(p.source_ids)=0
      or exists(
        select 1
        from unnest(p.source_ids) sid
        left join public.hb_policy_sources s on s.id=sid
        where s.id is null
           or s.country_pack_id<>p_pack_id
           or not s.active
           or s.source_type<>'official'
      )
    ) as active_policies_without_official_sources
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
    'official_sources_active',metrics.official_sources_active,
    'official_sources_verified',metrics.official_sources_verified,
    'oldest_source_verification',metrics.oldest_source_verification,
    'services_without_authority',metrics.services_without_authority,
    'services_without_policy',metrics.services_without_policy,
    'services_without_workflow',metrics.services_without_workflow,
    'services_without_active_policy',metrics.services_without_active_policy,
    'services_without_active_workflow',metrics.services_without_active_workflow,
    'active_policies_without_official_sources',metrics.active_policies_without_official_sources
  ),
  'ready_for_activation',
    pack.jurisdiction_active
    and pack.level='country'
    and metrics.authorities_active>0
    and metrics.services_active>0
    and metrics.official_sources_active>0
    and metrics.services_without_authority=0
    and metrics.services_without_policy=0
    and metrics.services_without_workflow=0
    and metrics.services_without_active_policy=0
    and metrics.services_without_active_workflow=0
    and metrics.active_policies_without_official_sources=0
)
from pack,metrics;
$$;

create or replace function public.hb_owner_create_country_pack_draft(
  p_country_code text,
  p_name_en text,
  p_name_ar text,
  p_default_locale text,
  p_default_currency text,
  p_supported_languages text[],
  p_data_residency_region text default null
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_code text := upper(btrim(coalesce(p_country_code,'')));
  v_currency text := upper(btrim(coalesce(p_default_currency,'')));
  v_pack_key text;
  v_jurisdiction_id uuid;
  v_pack_id uuid;
  v_version integer;
begin
  if v_uid is null then
    raise exception 'Authentication required' using errcode='42501';
  end if;

  if not exists(
    select 1 from public.hb_tenant_members tm
    where tm.user_id=v_uid and tm.role in ('owner','admin')
  ) then
    raise exception 'Owner/admin access required' using errcode='42501';
  end if;

  if v_code !~ '^[A-Z]{2}$' then
    raise exception 'Invalid ISO country code' using errcode='22023';
  end if;
  if v_currency !~ '^[A-Z]{3}$' then
    raise exception 'Invalid ISO currency code' using errcode='22023';
  end if;
  if char_length(btrim(coalesce(p_name_en,'')))<2
     or char_length(btrim(coalesce(p_name_ar,'')))<2
     or char_length(btrim(coalesce(p_default_locale,'')))<2
     or coalesce(cardinality(p_supported_languages),0)=0
  then
    raise exception 'Incomplete country pack identity' using errcode='22023';
  end if;

  select j.id into v_jurisdiction_id
  from public.hb_jurisdictions j
  where upper(j.code)=v_code and j.level='country'
  limit 1;

  if v_jurisdiction_id is null then
    insert into public.hb_jurisdictions(
      code,name_ar,name_en,level,parent_id,default_currency,default_locale,data_residency_region,active
    )
    values(
      v_code,btrim(p_name_ar),btrim(p_name_en),'country',null,v_currency,btrim(p_default_locale),
      nullif(btrim(coalesce(p_data_residency_region,'')),''),true
    )
    returning id into v_jurisdiction_id;
  end if;

  v_pack_key:='country:'||v_code;
  select coalesce(max(cp.version),0)+1 into v_version
  from public.hb_country_packs cp
  where cp.pack_key=v_pack_key;

  insert into public.hb_country_packs(
    pack_key,country_jurisdiction_id,version,status,default_locale,default_currency,
    data_residency_region,supported_languages,capabilities,metadata
  )
  values(
    v_pack_key,v_jurisdiction_id,v_version,'draft',btrim(p_default_locale),v_currency,
    nullif(btrim(coalesce(p_data_residency_region,'')),''),
    array(select distinct lower(btrim(x)) from unnest(p_supported_languages) x where btrim(x)<>''),
    jsonb_build_object(
      'service_catalog',false,
      'policy_engine',false,
      'workflow_engine',false,
      'source_verification',false,
      'assisted_execution',false,
      'direct_execution_links',false
    ),
    jsonb_build_object(
      'country_code',v_code,
      'created_by',v_uid,
      'onboarding_state','draft',
      'activation_rule','requires country_pack_health.ready_for_activation=true'
    )
  )
  returning id into v_pack_id;

  return jsonb_build_object(
    'id',v_pack_id,
    'pack_key',v_pack_key,
    'version',v_version,
    'status','draft',
    'country_jurisdiction_id',v_jurisdiction_id
  );
end;
$$;

revoke all on function public.hb_owner_create_country_pack_draft(text,text,text,text,text,text[],text)
from public,anon;
grant execute on function public.hb_owner_create_country_pack_draft(text,text,text,text,text,text[],text)
to authenticated;
