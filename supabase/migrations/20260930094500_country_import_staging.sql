-- Country Pack import staging. No staged item becomes live through this migration.

create table if not exists public.hb_country_pack_import_batches(
  id uuid primary key default gen_random_uuid(),
  country_pack_id uuid not null references public.hb_country_packs(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete restrict,
  source_label text,
  status text not null default 'draft'
    check(status in ('draft','validating','ready','blocked','imported','cancelled')),
  total_items integer not null default 0,
  valid_items integer not null default 0,
  invalid_items integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  validated_at timestamptz,
  imported_at timestamptz
);

create table if not exists public.hb_country_pack_import_items(
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.hb_country_pack_import_batches(id) on delete cascade,
  item_type text not null
    check(item_type in ('authority','policy_source','policy_version','workflow','service_binding')),
  external_ref text,
  payload jsonb not null,
  status text not null default 'pending'
    check(status in ('pending','valid','invalid','imported','skipped')),
  validation_errors jsonb not null default '[]'::jsonb,
  checksum text not null,
  created_at timestamptz not null default now(),
  validated_at timestamptz
);

create unique index if not exists hb_country_pack_import_items_ref_idx
  on public.hb_country_pack_import_items(batch_id,item_type,external_ref)
  where external_ref is not null;
create index if not exists hb_country_pack_import_items_status_idx
  on public.hb_country_pack_import_items(batch_id,status,item_type);
create index if not exists hb_country_pack_import_batches_pack_idx
  on public.hb_country_pack_import_batches(country_pack_id,created_at desc);
create index if not exists hb_country_pack_import_batches_created_by_idx
  on public.hb_country_pack_import_batches(created_by,created_at desc);

alter table public.hb_country_pack_import_batches enable row level security;
alter table public.hb_country_pack_import_items enable row level security;

drop policy if exists "backend only deny client access" on public.hb_country_pack_import_batches;
create policy "backend only deny client access"
on public.hb_country_pack_import_batches for all to public using(false) with check(false);
drop policy if exists "backend only deny client access" on public.hb_country_pack_import_items;
create policy "backend only deny client access"
on public.hb_country_pack_import_items for all to public using(false) with check(false);

revoke all on public.hb_country_pack_import_batches from anon,authenticated;
revoke all on public.hb_country_pack_import_items from anon,authenticated;

create or replace function public.hb_owner_create_country_import_batch(
  p_pack_key text,
  p_source_label text default null
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_pack public.hb_country_packs%rowtype;
  v_batch_id uuid;
begin
  if v_uid is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if not hb_private.is_platform_owner() then raise exception 'Platform owner access required' using errcode='42501'; end if;

  select * into v_pack
  from public.hb_country_packs
  where pack_key=btrim(p_pack_key)
  order by version desc limit 1;

  if not found then raise exception 'Country pack not found' using errcode='P0002'; end if;
  if v_pack.status not in ('draft','review') then
    raise exception 'Imports are only allowed into draft/review country packs' using errcode='22023';
  end if;

  insert into public.hb_country_pack_import_batches(country_pack_id,created_by,source_label,status,metadata)
  values(
    v_pack.id,v_uid,nullif(left(btrim(coalesce(p_source_label,'')),240),''),
    'draft',jsonb_build_object('pack_key',v_pack.pack_key,'pack_version',v_pack.version)
  )
  returning id into v_batch_id;

  return jsonb_build_object('batch_id',v_batch_id,'pack_key',v_pack.pack_key,'pack_version',v_pack.version,'status','draft');
end;
$$;

create or replace function public.hb_owner_stage_country_import_items(
  p_batch_id uuid,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_batch public.hb_country_pack_import_batches%rowtype;
  v_item jsonb;
  v_type text;
  v_external_ref text;
  v_payload jsonb;
  v_count integer := 0;
begin
  if v_uid is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if not hb_private.is_platform_owner() then raise exception 'Platform owner access required' using errcode='42501'; end if;

  select * into v_batch from public.hb_country_pack_import_batches where id=p_batch_id for update;
  if not found then raise exception 'Import batch not found' using errcode='P0002'; end if;
  if v_batch.status not in ('draft','blocked') then raise exception 'Batch is not open for staging' using errcode='22023'; end if;
  if jsonb_typeof(p_items)<>'array' then raise exception 'Items must be a JSON array' using errcode='22023'; end if;
  if jsonb_array_length(p_items)>500 then raise exception 'Maximum 500 items per staging call' using errcode='22023'; end if;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_type:=btrim(coalesce(v_item->>'item_type',''));
    v_external_ref:=nullif(left(btrim(coalesce(v_item->>'external_ref','')),240),'');
    v_payload:=coalesce(v_item->'payload','{}'::jsonb);

    if v_type not in ('authority','policy_source','policy_version','workflow','service_binding') then
      raise exception 'Unsupported import item type: %',v_type using errcode='22023';
    end if;
    if jsonb_typeof(v_payload)<>'object' then raise exception 'Import payload must be an object' using errcode='22023'; end if;

    insert into public.hb_country_pack_import_items(
      batch_id,item_type,external_ref,payload,status,validation_errors,checksum
    )
    values(
      p_batch_id,v_type,v_external_ref,v_payload,'pending','[]'::jsonb,
      encode(extensions.digest(v_payload::text,'sha256'),'hex')
    )
    on conflict(batch_id,item_type,external_ref)
    where external_ref is not null
    do update set
      payload=excluded.payload,
      checksum=excluded.checksum,
      status='pending',
      validation_errors='[]'::jsonb,
      validated_at=null;

    v_count:=v_count+1;
  end loop;

  update public.hb_country_pack_import_batches b
  set status='draft',
      total_items=(select count(*) from public.hb_country_pack_import_items i where i.batch_id=b.id),
      valid_items=0,invalid_items=0,validated_at=null
  where b.id=p_batch_id;

  return jsonb_build_object(
    'batch_id',p_batch_id,'staged_in_call',v_count,
    'total_items',(select count(*) from public.hb_country_pack_import_items where batch_id=p_batch_id)
  );
end;
$$;

create or replace function public.hb_owner_validate_country_import_batch(p_batch_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_batch public.hb_country_pack_import_batches%rowtype;
  v_item record;
  v_errors jsonb;
  v_ref text;
  v_valid integer;
  v_invalid integer;
  v_total integer;
begin
  if v_uid is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if not hb_private.is_platform_owner() then raise exception 'Platform owner access required' using errcode='42501'; end if;

  select * into v_batch from public.hb_country_pack_import_batches where id=p_batch_id for update;
  if not found then raise exception 'Import batch not found' using errcode='P0002'; end if;
  if v_batch.status in ('imported','cancelled') then raise exception 'Batch is closed' using errcode='22023'; end if;

  update public.hb_country_pack_import_batches set status='validating' where id=p_batch_id;

  for v_item in
    select id,item_type,external_ref,payload
    from public.hb_country_pack_import_items
    where batch_id=p_batch_id
    order by created_at,id
  loop
    v_errors:='[]'::jsonb;

    if v_item.item_type='authority' then
      if nullif(btrim(v_item.payload->>'authority_key'),'') is null then v_errors:=v_errors||jsonb_build_array('authority_key_required'); end if;
      if nullif(btrim(v_item.payload->>'name_en'),'') is null then v_errors:=v_errors||jsonb_build_array('name_en_required'); end if;

    elsif v_item.item_type='policy_source' then
      if nullif(btrim(v_item.payload->>'authority_key'),'') is null then v_errors:=v_errors||jsonb_build_array('authority_key_required'); end if;
      if nullif(btrim(v_item.payload->>'title'),'') is null then v_errors:=v_errors||jsonb_build_array('title_required'); end if;
      if coalesce(v_item.payload->>'source_url','') !~ '^https://' then v_errors:=v_errors||jsonb_build_array('official_https_source_url_required'); end if;

    elsif v_item.item_type='policy_version' then
      if nullif(btrim(v_item.payload->>'policy_key'),'') is null then v_errors:=v_errors||jsonb_build_array('policy_key_required'); end if;
      if jsonb_typeof(v_item.payload->'rules')<>'array' then v_errors:=v_errors||jsonb_build_array('rules_array_required'); end if;
      if jsonb_typeof(v_item.payload->'source_refs')<>'array'
         or jsonb_array_length(coalesce(v_item.payload->'source_refs','[]'::jsonb))=0 then
        v_errors:=v_errors||jsonb_build_array('source_refs_required');
      end if;

    elsif v_item.item_type='workflow' then
      if nullif(btrim(v_item.payload->>'workflow_key'),'') is null then v_errors:=v_errors||jsonb_build_array('workflow_key_required'); end if;
      if jsonb_typeof(v_item.payload->'definition')<>'object' then v_errors:=v_errors||jsonb_build_array('workflow_definition_required'); end if;
      if jsonb_typeof(v_item.payload#>'{definition,steps}')<>'array'
         or jsonb_array_length(coalesce(v_item.payload#>'{definition,steps}','[]'::jsonb))=0 then
        v_errors:=v_errors||jsonb_build_array('workflow_steps_required');
      end if;

    elsif v_item.item_type='service_binding' then
      if nullif(btrim(v_item.payload->>'service_slug'),'') is null then v_errors:=v_errors||jsonb_build_array('service_slug_required'); end if;
      if nullif(btrim(v_item.payload->>'authority_key'),'') is null then v_errors:=v_errors||jsonb_build_array('authority_key_required'); end if;
      if nullif(btrim(v_item.payload->>'policy_key'),'') is null then v_errors:=v_errors||jsonb_build_array('policy_key_required'); end if;
      if nullif(btrim(v_item.payload->>'workflow_key'),'') is null then v_errors:=v_errors||jsonb_build_array('workflow_key_required'); end if;
    end if;

    if jsonb_array_length(v_errors)=0 and v_item.item_type='policy_source' then
      if not exists(
        select 1 from public.hb_country_pack_import_items i
        where i.batch_id=p_batch_id and i.item_type='authority'
          and i.payload->>'authority_key'=v_item.payload->>'authority_key'
      ) and not exists(
        select 1 from public.hb_authorities a
        where a.country_pack_id=v_batch.country_pack_id
          and a.authority_key=v_item.payload->>'authority_key'
      ) then
        v_errors:=v_errors||jsonb_build_array('authority_reference_not_found');
      end if;
    end if;

    if jsonb_array_length(v_errors)=0 and v_item.item_type='policy_version'
       and jsonb_typeof(v_item.payload->'source_refs')='array' then
      for v_ref in select value from jsonb_array_elements_text(v_item.payload->'source_refs')
      loop
        if not exists(
          select 1 from public.hb_country_pack_import_items i
          where i.batch_id=p_batch_id and i.item_type='policy_source' and i.external_ref=v_ref
        ) then
          v_errors:=v_errors||jsonb_build_array('source_reference_not_found:'||v_ref);
        end if;
      end loop;
    end if;

    if jsonb_array_length(v_errors)=0 and v_item.item_type='service_binding' then
      if not exists(
        select 1 from public.hb_country_pack_import_items i
        where i.batch_id=p_batch_id and i.item_type='authority'
          and i.payload->>'authority_key'=v_item.payload->>'authority_key'
      ) and not exists(
        select 1 from public.hb_authorities a
        where a.country_pack_id=v_batch.country_pack_id
          and a.authority_key=v_item.payload->>'authority_key'
      ) then
        v_errors:=v_errors||jsonb_build_array('authority_reference_not_found');
      end if;

      if not exists(
        select 1 from public.hb_country_pack_import_items i
        where i.batch_id=p_batch_id and i.item_type='policy_version'
          and i.payload->>'policy_key'=v_item.payload->>'policy_key'
      ) and not exists(
        select 1 from public.hb_policy_versions p
        where p.country_pack_id=v_batch.country_pack_id
          and p.policy_key=v_item.payload->>'policy_key'
      ) then
        v_errors:=v_errors||jsonb_build_array('policy_reference_not_found');
      end if;

      if not exists(
        select 1 from public.hb_country_pack_import_items i
        where i.batch_id=p_batch_id and i.item_type='workflow'
          and i.payload->>'workflow_key'=v_item.payload->>'workflow_key'
      ) and not exists(
        select 1 from public.hb_workflow_templates w
        where w.country_pack_id=v_batch.country_pack_id
          and w.workflow_key=v_item.payload->>'workflow_key'
      ) then
        v_errors:=v_errors||jsonb_build_array('workflow_reference_not_found');
      end if;

      if exists(
        select 1 from public.hb_service_bindings b
        where b.active=true and b.service_slug=v_item.payload->>'service_slug'
          and b.country_pack_id<>v_batch.country_pack_id
      ) then
        v_errors:=v_errors||jsonb_build_array('service_slug_conflicts_with_other_country');
      end if;
    end if;

    update public.hb_country_pack_import_items
    set validation_errors=v_errors,
        status=case when jsonb_array_length(v_errors)=0 then 'valid' else 'invalid' end,
        validated_at=now()
    where id=v_item.id;
  end loop;

  select count(*),count(*) filter(where status='valid'),count(*) filter(where status='invalid')
  into v_total,v_valid,v_invalid
  from public.hb_country_pack_import_items
  where batch_id=p_batch_id;

  update public.hb_country_pack_import_batches
  set total_items=v_total,valid_items=v_valid,invalid_items=v_invalid,
      status=case when v_total>0 and v_invalid=0 then 'ready' else 'blocked' end,
      validated_at=now()
  where id=p_batch_id;

  return jsonb_build_object(
    'batch_id',p_batch_id,
    'status',case when v_total>0 and v_invalid=0 then 'ready' else 'blocked' end,
    'total_items',v_total,'valid_items',v_valid,'invalid_items',v_invalid
  );
end;
$$;

create or replace function public.hb_owner_country_import_batch(p_batch_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path=''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_payload jsonb;
begin
  if v_uid is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if not hb_private.is_platform_owner() then raise exception 'Platform owner access required' using errcode='42501'; end if;

  select jsonb_build_object(
    'batch',to_jsonb(b),
    'items',coalesce((
      select jsonb_agg(to_jsonb(i) order by i.created_at,i.id)
      from public.hb_country_pack_import_items i where i.batch_id=b.id
    ),'[]'::jsonb)
  )
  into v_payload
  from public.hb_country_pack_import_batches b
  where b.id=p_batch_id;

  if v_payload is null then raise exception 'Import batch not found' using errcode='P0002'; end if;
  return v_payload;
end;
$$;

revoke all on function public.hb_owner_create_country_import_batch(text,text) from public,anon;
grant execute on function public.hb_owner_create_country_import_batch(text,text) to authenticated;
revoke all on function public.hb_owner_stage_country_import_items(uuid,jsonb) from public,anon;
grant execute on function public.hb_owner_stage_country_import_items(uuid,jsonb) to authenticated;
revoke all on function public.hb_owner_validate_country_import_batch(uuid) from public,anon;
grant execute on function public.hb_owner_validate_country_import_batch(uuid) to authenticated;
revoke all on function public.hb_owner_country_import_batch(uuid) from public,anon;
grant execute on function public.hb_owner_country_import_batch(uuid) to authenticated;
