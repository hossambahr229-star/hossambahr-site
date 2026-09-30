-- Materialize a validated Country Pack import as an inactive draft catalog.
-- Nothing becomes live in this step.

create or replace function hb_private.assign_country_pack_and_authority()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  v_country_id uuid;
  v_pack_status text;
begin
  if new.jurisdiction_id is null then
    raise exception 'jurisdiction_id is required for country-pack scoped records';
  end if;

  v_country_id:=hb_private.country_root_jurisdiction(new.jurisdiction_id);
  if v_country_id is null then
    raise exception 'Country root not found for jurisdiction';
  end if;

  select cp.id,cp.status
    into new.country_pack_id,v_pack_status
  from public.hb_country_packs cp
  where cp.country_jurisdiction_id=v_country_id
    and cp.status in ('active','review','draft')
  order by case cp.status when 'active' then 0 when 'review' then 1 else 2 end,cp.version desc
  limit 1;

  if new.country_pack_id is null then
    raise exception 'Country pack not found for jurisdiction';
  end if;

  new.authority_id:=null;
  if new.authority_key is not null then
    select a.id into new.authority_id
    from public.hb_authorities a
    where a.country_pack_id=new.country_pack_id
      and a.authority_key=new.authority_key
      and (
        v_pack_status in ('draft','review')
        or a.active=true
      )
    order by a.active desc,a.created_at
    limit 1;
  end if;

  return new;
end;
$$;

create or replace function public.hb_owner_materialize_country_import_batch(p_batch_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_batch public.hb_country_pack_import_batches%rowtype;
  v_pack public.hb_country_packs%rowtype;
  v_item record;
  v_authority_id uuid;
  v_source_ids uuid[];
  v_ref text;
  v_source_item jsonb;
  v_source_id uuid;
  v_policy_version integer;
  v_workflow_version integer;
  v_imported integer := 0;
begin
  if v_uid is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if not hb_private.is_platform_owner() then raise exception 'Platform owner access required' using errcode='42501'; end if;

  select * into v_batch
  from public.hb_country_pack_import_batches
  where id=p_batch_id
  for update;

  if not found then raise exception 'Import batch not found' using errcode='P0002'; end if;
  if v_batch.status<>'ready' or v_batch.invalid_items<>0 or v_batch.total_items=0 then
    raise exception 'Import batch must be ready with zero invalid items' using errcode='22023';
  end if;

  select * into v_pack
  from public.hb_country_packs
  where id=v_batch.country_pack_id
  for update;

  if not found or v_pack.status not in ('draft','review') then
    raise exception 'Country pack is not open for draft materialization' using errcode='22023';
  end if;

  for v_item in
    select id,external_ref,payload
    from public.hb_country_pack_import_items
    where batch_id=p_batch_id and item_type='authority' and status='valid'
    order by created_at,id
  loop
    insert into public.hb_authorities(
      country_pack_id,jurisdiction_id,authority_key,name_ar,name_en,scope,
      official_base_url,portal_url,active,metadata
    )
    values(
      v_pack.id,v_pack.country_jurisdiction_id,
      v_item.payload->>'authority_key',
      nullif(v_item.payload->>'name_ar',''),
      v_item.payload->>'name_en',
      case when v_item.payload->>'scope' in ('federal','local','free_zone','municipal','judicial','other')
           then v_item.payload->>'scope' else 'other' end,
      nullif(v_item.payload->>'official_base_url',''),
      nullif(v_item.payload->>'portal_url',''),
      false,
      jsonb_build_object(
        'import_batch_id',p_batch_id,
        'import_external_ref',v_item.external_ref,
        'imported_by',v_uid
      ) || coalesce(v_item.payload->'metadata','{}'::jsonb)
    )
    on conflict(country_pack_id,authority_key) do nothing;

    update public.hb_country_pack_import_items set status='imported' where id=v_item.id;
    v_imported:=v_imported+1;
  end loop;

  for v_item in
    select id,external_ref,payload
    from public.hb_country_pack_import_items
    where batch_id=p_batch_id and item_type='policy_source' and status='valid'
    order by created_at,id
  loop
    select a.id into v_authority_id
    from public.hb_authorities a
    where a.country_pack_id=v_pack.id
      and a.authority_key=v_item.payload->>'authority_key'
    limit 1;

    if v_authority_id is null then
      raise exception 'Authority missing during materialization: %',v_item.payload->>'authority_key'
        using errcode='22023';
    end if;

    if exists(
      select 1 from public.hb_policy_sources s
      where s.authority_key=v_item.payload->>'authority_key'
        and s.source_url=v_item.payload->>'source_url'
        and s.country_pack_id<>v_pack.id
    ) then
      raise exception 'Policy source conflicts with another Country Pack' using errcode='23505';
    end if;

    insert into public.hb_policy_sources(
      jurisdiction_id,authority_key,title,source_url,source_type,last_verified_at,active,
      metadata,country_pack_id,authority_id,monitor_enabled,review_required
    )
    values(
      v_pack.country_jurisdiction_id,
      v_item.payload->>'authority_key',
      v_item.payload->>'title',
      v_item.payload->>'source_url',
      'official',
      null,
      false,
      jsonb_build_object(
        'import_batch_id',p_batch_id,
        'import_external_ref',v_item.external_ref,
        'imported_by',v_uid,
        'verification_state','unverified'
      ) || coalesce(v_item.payload->'metadata','{}'::jsonb),
      v_pack.id,
      v_authority_id,
      false,
      true
    )
    on conflict(authority_key,source_url) do nothing;

    update public.hb_country_pack_import_items set status='imported' where id=v_item.id;
    v_imported:=v_imported+1;
  end loop;

  for v_item in
    select id,external_ref,payload
    from public.hb_country_pack_import_items
    where batch_id=p_batch_id and item_type='policy_version' and status='valid'
    order by created_at,id
  loop
    v_source_ids:='{}'::uuid[];

    for v_ref in select value from jsonb_array_elements_text(v_item.payload->'source_refs')
    loop
      select i.payload into v_source_item
      from public.hb_country_pack_import_items i
      where i.batch_id=p_batch_id
        and i.item_type='policy_source'
        and i.external_ref=v_ref
      limit 1;

      select s.id into v_source_id
      from public.hb_policy_sources s
      where s.country_pack_id=v_pack.id
        and s.authority_key=v_source_item->>'authority_key'
        and s.source_url=v_source_item->>'source_url'
      limit 1;

      if v_source_id is null then
        raise exception 'Source missing during policy materialization: %',v_ref using errcode='22023';
      end if;
      v_source_ids:=array_append(v_source_ids,v_source_id);
    end loop;

    select coalesce(max(p.version),0)+1 into v_policy_version
    from public.hb_policy_versions p
    where p.country_pack_id=v_pack.id
      and p.policy_key=v_item.payload->>'policy_key';

    insert into public.hb_policy_versions(
      policy_key,jurisdiction_id,version,effective_from,effective_until,status,
      rules,source_ids,reviewed_by,reviewed_at,country_pack_id
    )
    values(
      v_item.payload->>'policy_key',
      v_pack.country_jurisdiction_id,
      v_policy_version,
      now(),
      null,
      'draft',
      v_item.payload->'rules',
      v_source_ids,
      null,
      null,
      v_pack.id
    );

    update public.hb_country_pack_import_items set status='imported' where id=v_item.id;
    v_imported:=v_imported+1;
  end loop;

  for v_item in
    select id,external_ref,payload
    from public.hb_country_pack_import_items
    where batch_id=p_batch_id and item_type='workflow' and status='valid'
    order by created_at,id
  loop
    select coalesce(max(w.version),0)+1 into v_workflow_version
    from public.hb_workflow_templates w
    where w.country_pack_id=v_pack.id
      and w.workflow_key=v_item.payload->>'workflow_key';

    insert into public.hb_workflow_templates(
      workflow_key,jurisdiction_id,service_slug,version,status,definition,
      effective_from,effective_until,country_pack_id
    )
    values(
      v_item.payload->>'workflow_key',
      v_pack.country_jurisdiction_id,
      nullif(v_item.payload->>'service_slug',''),
      v_workflow_version,
      'draft',
      v_item.payload->'definition',
      now(),
      null,
      v_pack.id
    );

    update public.hb_country_pack_import_items set status='imported' where id=v_item.id;
    v_imported:=v_imported+1;
  end loop;

  for v_item in
    select id,external_ref,payload
    from public.hb_country_pack_import_items
    where batch_id=p_batch_id and item_type='service_binding' and status='valid'
    order by created_at,id
  loop
    select a.id into v_authority_id
    from public.hb_authorities a
    where a.country_pack_id=v_pack.id
      and a.authority_key=v_item.payload->>'authority_key'
    limit 1;

    if not exists(
      select 1 from public.hb_service_bindings b
      where b.country_pack_id=v_pack.id
        and b.service_slug=v_item.payload->>'service_slug'
    ) then
      insert into public.hb_service_bindings(
        service_slug,jurisdiction_id,authority_key,policy_key,workflow_key,
        execution_mode,active,metadata,country_pack_id,authority_id
      )
      values(
        v_item.payload->>'service_slug',
        v_pack.country_jurisdiction_id,
        v_item.payload->>'authority_key',
        v_item.payload->>'policy_key',
        v_item.payload->>'workflow_key',
        case when v_item.payload->>'execution_mode' in ('guidance','assisted','direct-execution')
             then v_item.payload->>'execution_mode' else 'guidance' end,
        false,
        jsonb_build_object(
          'import_batch_id',p_batch_id,
          'import_external_ref',v_item.external_ref,
          'imported_by',v_uid
        ) || coalesce(v_item.payload->'metadata','{}'::jsonb),
        v_pack.id,
        v_authority_id
      );
    end if;

    update public.hb_country_pack_import_items set status='imported' where id=v_item.id;
    v_imported:=v_imported+1;
  end loop;

  update public.hb_country_pack_import_batches
  set status='imported',
      imported_at=now(),
      metadata=metadata || jsonb_build_object(
        'materialized_as','inactive_draft_catalog',
        'materialized_by',v_uid
      )
  where id=p_batch_id;

  update public.hb_country_packs
  set status='review',
      metadata=metadata || jsonb_build_object(
        'onboarding_state','materialized_for_review',
        'last_import_batch_id',p_batch_id
      )
  where id=v_pack.id and status='draft';

  return jsonb_build_object(
    'batch_id',p_batch_id,
    'pack_id',v_pack.id,
    'pack_key',v_pack.pack_key,
    'status','imported',
    'items_materialized',v_imported,
    'catalog_state','inactive_draft'
  );
end;
$$;

revoke all on function public.hb_owner_materialize_country_import_batch(uuid) from public,anon;
grant execute on function public.hb_owner_materialize_country_import_batch(uuid) to authenticated;
