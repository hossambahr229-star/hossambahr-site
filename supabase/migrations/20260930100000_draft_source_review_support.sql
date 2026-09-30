-- Allow human verification of official sources before a draft/review Country Pack is activated.

drop function if exists public.hb_owner_manual_policy_sources(integer);

create function public.hb_owner_manual_policy_sources(p_limit integer default 50)
returns table(
  source_id uuid,
  title text,
  authority_key text,
  source_url text,
  last_verified_at timestamptz,
  review_required boolean,
  last_change_detected_at timestamptz,
  monitor_reason text,
  source_active boolean,
  pack_key text,
  pack_status text
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
  select
    s.id,s.title,s.authority_key,s.source_url,s.last_verified_at,s.review_required,
    s.last_change_detected_at,s.metadata->>'monitor_reason',s.active,cp.pack_key,cp.status
  from public.hb_policy_sources s
  join public.hb_country_packs cp on cp.id=s.country_pack_id
  where s.source_type='official'
    and (
      (s.active=true and s.monitor_enabled=false)
      or
      (s.active=false and cp.status in ('draft','review'))
    )
  order by
    case when s.active=false then 0 else 1 end,
    s.review_required desc,
    s.last_verified_at asc nulls first,
    s.title
  limit least(greatest(coalesce(p_limit,50),1),100);
end;
$$;

create or replace function public.hb_owner_record_policy_source_review(
  p_source_id uuid,
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
  v_source public.hb_policy_sources%rowtype;
  v_pack_status text;
begin
  if v_uid is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if not hb_private.is_platform_owner() then raise exception 'Platform owner access required' using errcode='42501'; end if;
  if p_outcome not in ('verified_no_change','change_detected','unreachable') then
    raise exception 'Invalid review outcome' using errcode='22023';
  end if;

  select s.* into v_source
  from public.hb_policy_sources s
  join public.hb_country_packs cp on cp.id=s.country_pack_id
  where s.id=p_source_id
    and s.source_type='official'
    and (s.active=true or cp.status in ('draft','review'))
  for update of s;

  if not found then raise exception 'Policy source not available for review' using errcode='P0002'; end if;

  select cp.status into v_pack_status
  from public.hb_country_packs cp
  where cp.id=v_source.country_pack_id;

  insert into public.hb_policy_source_reviews(
    source_id,reviewed_by,outcome,note,metadata
  )
  values(
    p_source_id,v_uid,p_outcome,
    nullif(left(btrim(coalesce(p_note,'')),1000),''),
    jsonb_build_object(
      'previous_last_verified_at',v_source.last_verified_at,
      'previous_review_required',v_source.review_required,
      'source_active',v_source.active,
      'pack_status',v_pack_status,
      'monitor_mode',case when v_source.monitor_enabled then 'automatic' else 'manual' end
    )
  );

  if p_outcome='verified_no_change' then
    update public.hb_policy_sources
    set last_verified_at=now(),
        review_required=false,
        monitor_error=null,
        metadata=metadata || jsonb_build_object(
          'last_manual_review_outcome',p_outcome,
          'last_manual_reviewed_at',now(),
          'last_manual_reviewed_by',v_uid,
          'verification_state','human_verified'
        )
    where id=p_source_id;
  elsif p_outcome='change_detected' then
    update public.hb_policy_sources
    set review_required=true,
        last_change_detected_at=coalesce(last_change_detected_at,now()),
        metadata=metadata || jsonb_build_object(
          'last_manual_review_outcome',p_outcome,
          'last_manual_reviewed_at',now(),
          'last_manual_reviewed_by',v_uid
        )
    where id=p_source_id;
  else
    update public.hb_policy_sources
    set metadata=metadata || jsonb_build_object(
          'last_manual_review_outcome',p_outcome,
          'last_manual_reviewed_at',now(),
          'last_manual_reviewed_by',v_uid
        )
    where id=p_source_id;
  end if;

  return jsonb_build_object(
    'source_id',p_source_id,
    'outcome',p_outcome,
    'source_active',v_source.active,
    'pack_status',v_pack_status,
    'last_verified_at',(select last_verified_at from public.hb_policy_sources where id=p_source_id),
    'review_required',(select review_required from public.hb_policy_sources where id=p_source_id)
  );
end;
$$;

revoke all on function public.hb_owner_manual_policy_sources(integer) from public,anon;
grant execute on function public.hb_owner_manual_policy_sources(integer) to authenticated;
