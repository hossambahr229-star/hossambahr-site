-- Manual review workflow for official sources that cannot be monitored from Edge.

create table if not exists public.hb_policy_source_reviews(
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.hb_policy_sources(id) on delete cascade,
  reviewed_by uuid not null references auth.users(id) on delete restrict,
  outcome text not null check(outcome in ('verified_no_change','change_detected','unreachable')),
  note text,
  reviewed_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists hb_policy_source_reviews_source_time_idx
  on public.hb_policy_source_reviews(source_id,reviewed_at desc);

alter table public.hb_policy_source_reviews enable row level security;
revoke all on public.hb_policy_source_reviews from anon,authenticated;

create or replace function public.hb_owner_manual_policy_sources(p_limit integer default 50)
returns table(
  source_id uuid,
  title text,
  authority_key text,
  source_url text,
  last_verified_at timestamptz,
  review_required boolean,
  last_change_detected_at timestamptz,
  monitor_reason text
)
language plpgsql
stable
security definer
set search_path=''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required' using errcode='42501';
  end if;
  if not hb_private.is_platform_owner() then
    raise exception 'Platform owner access required' using errcode='42501';
  end if;

  return query
  select
    s.id,s.title,s.authority_key,s.source_url,s.last_verified_at,s.review_required,
    s.last_change_detected_at,s.metadata->>'monitor_reason'
  from public.hb_policy_sources s
  where s.active=true
    and s.source_type='official'
    and s.monitor_enabled=false
  order by s.review_required desc,s.last_verified_at asc nulls first,s.title
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
begin
  if v_uid is null then
    raise exception 'Authentication required' using errcode='42501';
  end if;
  if not hb_private.is_platform_owner() then
    raise exception 'Platform owner access required' using errcode='42501';
  end if;
  if p_outcome not in ('verified_no_change','change_detected','unreachable') then
    raise exception 'Invalid review outcome' using errcode='22023';
  end if;

  select * into v_source
  from public.hb_policy_sources
  where id=p_source_id and active=true and source_type='official'
  for update;

  if not found then
    raise exception 'Policy source not found' using errcode='P0002';
  end if;

  insert into public.hb_policy_source_reviews(
    source_id,reviewed_by,outcome,note,metadata
  )
  values(
    p_source_id,v_uid,p_outcome,
    nullif(left(btrim(coalesce(p_note,'')),1000),''),
    jsonb_build_object(
      'previous_last_verified_at',v_source.last_verified_at,
      'previous_review_required',v_source.review_required,
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
          'last_manual_reviewed_by',v_uid
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
    'last_verified_at',(select last_verified_at from public.hb_policy_sources where id=p_source_id),
    'review_required',(select review_required from public.hb_policy_sources where id=p_source_id)
  );
end;
$$;

revoke all on function public.hb_owner_manual_policy_sources(integer) from public,anon;
grant execute on function public.hb_owner_manual_policy_sources(integer) to authenticated;

revoke all on function public.hb_owner_record_policy_source_review(uuid,text,text) from public,anon;
grant execute on function public.hb_owner_record_policy_source_review(uuid,text,text) to authenticated;
