-- Official policy source monitoring.
-- Monitoring detects technical/content changes only. It never updates last_verified_at
-- and never mutates active policy rules automatically.

create extension if not exists pg_net;

alter table public.hb_policy_sources
  add column if not exists monitor_enabled boolean not null default true,
  add column if not exists monitor_locked_at timestamptz,
  add column if not exists last_checked_at timestamptz,
  add column if not exists last_http_status integer,
  add column if not exists last_etag text,
  add column if not exists last_modified_header text,
  add column if not exists last_content_hash text,
  add column if not exists last_change_detected_at timestamptz,
  add column if not exists review_required boolean not null default false,
  add column if not exists monitor_failures integer not null default 0,
  add column if not exists monitor_error text;

create index if not exists hb_policy_sources_monitor_due_idx
  on public.hb_policy_sources(active,source_type,monitor_enabled,last_checked_at)
  where active=true and source_type='official' and monitor_enabled=true;

create index if not exists hb_policy_sources_review_required_idx
  on public.hb_policy_sources(country_pack_id,review_required,last_change_detected_at desc)
  where review_required=true;

create table if not exists public.hb_policy_source_check_runs(
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.hb_policy_sources(id) on delete cascade,
  checked_at timestamptz not null default now(),
  http_status integer,
  etag text,
  last_modified_header text,
  content_hash text,
  changed boolean not null default false,
  error text,
  duration_ms integer,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists hb_policy_source_check_runs_source_time_idx
  on public.hb_policy_source_check_runs(source_id,checked_at desc);

alter table public.hb_policy_source_check_runs enable row level security;
revoke all on public.hb_policy_source_check_runs from anon,authenticated;

create table if not exists hb_private.internal_worker_tokens(
  name text primary key,
  token_hash text not null,
  created_at timestamptz not null default now(),
  rotated_at timestamptz
);

do $$
declare
  v_token text;
begin
  select decrypted_secret into v_token
  from vault.decrypted_secrets
  where name='policy_source_monitor_token'
  limit 1;

  if v_token is null then
    v_token:=encode(extensions.gen_random_bytes(32),'hex');
    perform vault.create_secret(
      v_token,
      'policy_source_monitor_token',
      'HOSSAM BAHR policy source monitor cron token'
    );
  end if;

  insert into hb_private.internal_worker_tokens(name,token_hash)
  values('policy-source-monitor',encode(extensions.digest(v_token,'sha256'),'hex'))
  on conflict(name) do update set
    token_hash=excluded.token_hash,
    rotated_at=case
      when hb_private.internal_worker_tokens.token_hash<>excluded.token_hash then now()
      else hb_private.internal_worker_tokens.rotated_at
    end;
end
$$;

create or replace function public.hb_verify_internal_token(p_name text,p_token text)
returns boolean
language sql
stable
security definer
set search_path=''
as $$
  select coalesce(exists(
    select 1
    from hb_private.internal_worker_tokens t
    where t.name=p_name
      and t.token_hash=encode(extensions.digest(coalesce(p_token,''),'sha256'),'hex')
  ),false)
$$;

revoke all on function public.hb_verify_internal_token(text,text) from public,anon,authenticated;
grant execute on function public.hb_verify_internal_token(text,text) to service_role;

create or replace function public.hb_claim_policy_source_checks(p_limit integer default 5)
returns table(
  id uuid,
  source_url text,
  previous_content_hash text,
  previous_etag text,
  previous_last_modified text
)
language plpgsql
security definer
set search_path=''
as $$
begin
  return query
  with candidates as (
    select s.id
    from public.hb_policy_sources s
    where s.active=true
      and s.source_type='official'
      and s.monitor_enabled=true
      and (
        s.last_checked_at is null
        or (
          s.monitor_failures>0
          and s.last_checked_at < now()-interval '1 hour'
        )
        or (
          s.monitor_failures=0
          and s.last_checked_at < now()-interval '24 hours'
        )
      )
      and (s.monitor_locked_at is null or s.monitor_locked_at < now()-interval '20 minutes')
    order by
      case when s.monitor_failures>0 then 0 else 1 end,
      s.last_checked_at asc nulls first,
      s.last_verified_at asc nulls first,
      s.id
    for update skip locked
    limit least(greatest(coalesce(p_limit,5),1),10)
  )
  update public.hb_policy_sources s
  set monitor_locked_at=now()
  from candidates c
  where s.id=c.id
  returning s.id,s.source_url,s.last_content_hash,s.last_etag,s.last_modified_header;
end;
$$;

revoke all on function public.hb_claim_policy_source_checks(integer) from public,anon,authenticated;
grant execute on function public.hb_claim_policy_source_checks(integer) to service_role;

create or replace function public.hb_finish_policy_source_check(
  p_source_id uuid,
  p_http_status integer default null,
  p_etag text default null,
  p_last_modified text default null,
  p_content_hash text default null,
  p_error text default null,
  p_duration_ms integer default null
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_source public.hb_policy_sources%rowtype;
  v_changed boolean := false;
  v_failure_count integer;
  v_review boolean;
begin
  select * into v_source
  from public.hb_policy_sources
  where id=p_source_id
  for update;

  if not found then
    raise exception 'Policy source not found' using errcode='P0002';
  end if;

  if p_error is null and coalesce(p_http_status,0) between 200 and 399 then
    v_changed :=
      v_source.last_content_hash is not null
      and p_content_hash is not null
      and v_source.last_content_hash<>p_content_hash;

    update public.hb_policy_sources
    set last_checked_at=now(),
        monitor_locked_at=null,
        last_http_status=p_http_status,
        last_etag=coalesce(nullif(p_etag,''),last_etag),
        last_modified_header=coalesce(nullif(p_last_modified,''),last_modified_header),
        last_content_hash=coalesce(nullif(p_content_hash,''),last_content_hash),
        last_change_detected_at=case when v_changed then now() else last_change_detected_at end,
        review_required=review_required or v_changed,
        monitor_failures=0,
        monitor_error=null
    where id=p_source_id;

    v_failure_count:=0;
    v_review:=v_source.review_required or v_changed;
  else
    v_failure_count:=v_source.monitor_failures+1;
    -- Technical monitoring failures are not policy changes. Only a confirmed
    -- hard missing response (404/410) can open review without a content hash delta.
    v_review:=v_source.review_required
      or coalesce(p_http_status,0) in (404,410);

    update public.hb_policy_sources
    set last_checked_at=now(),
        monitor_locked_at=null,
        last_http_status=p_http_status,
        monitor_failures=v_failure_count,
        monitor_error=left(coalesce(p_error,'http_status_'||coalesce(p_http_status::text,'unknown')),500),
        review_required=v_review
    where id=p_source_id;
  end if;

  insert into public.hb_policy_source_check_runs(
    source_id,http_status,etag,last_modified_header,content_hash,changed,error,duration_ms,metadata
  )
  values(
    p_source_id,p_http_status,nullif(p_etag,''),nullif(p_last_modified,''),nullif(p_content_hash,''),
    v_changed,left(p_error,500),p_duration_ms,
    jsonb_build_object('verification_changed',false,'monitor_only',true)
  );

  return jsonb_build_object(
    'source_id',p_source_id,
    'changed',v_changed,
    'review_required',v_review,
    'monitor_failures',v_failure_count
  );
end;
$$;

revoke all on function public.hb_finish_policy_source_check(uuid,integer,text,text,text,text,integer)
from public,anon,authenticated;
grant execute on function public.hb_finish_policy_source_check(uuid,integer,text,text,text,text,integer)
to service_role;

create or replace function public.hb_owner_policy_source_monitor()
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_payload jsonb;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required' using errcode='42501';
  end if;
  if not hb_private.is_platform_owner() then
    raise exception 'Platform owner access required' using errcode='42501';
  end if;

  select jsonb_build_object(
    'generated_at',now(),
    'sources_total',count(*),
    'review_required',count(*) filter(where review_required),
    'never_checked',count(*) filter(where last_checked_at is null),
    'checked_24h',count(*) filter(where last_checked_at>=now()-interval '24 hours'),
    'failed',count(*) filter(where monitor_failures>0),
    'hard_failures',count(*) filter(where last_http_status in (404,410)),
    'oldest_check',min(last_checked_at),
    'newest_check',max(last_checked_at)
  )
  into v_payload
  from public.hb_policy_sources
  where active=true and source_type='official' and monitor_enabled=true;

  return v_payload;
end;
$$;

revoke all on function public.hb_owner_policy_source_monitor() from public,anon;
grant execute on function public.hb_owner_policy_source_monitor() to authenticated;

create or replace function public.hb_owner_policy_sources_needing_review(p_limit integer default 25)
returns table(
  source_id uuid,
  title text,
  authority_key text,
  source_url text,
  last_checked_at timestamptz,
  last_http_status integer,
  last_change_detected_at timestamptz,
  monitor_failures integer,
  monitor_error text
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
    s.id,s.title,s.authority_key,s.source_url,s.last_checked_at,s.last_http_status,
    s.last_change_detected_at,s.monitor_failures,s.monitor_error
  from public.hb_policy_sources s
  where s.active=true
    and s.source_type='official'
    and s.review_required=true
  order by s.last_change_detected_at desc nulls last,s.monitor_failures desc,s.last_checked_at desc nulls last
  limit least(greatest(coalesce(p_limit,25),1),100);
end;
$$;

revoke all on function public.hb_owner_policy_sources_needing_review(integer) from public,anon;
grant execute on function public.hb_owner_policy_sources_needing_review(integer) to authenticated;

select cron.schedule(
  'hossambahr-policy-source-monitor',
  '*/15 * * * *',
  $cron$
  select net.http_post(
    url:='https://ngcrkuykfqmiqhsnpcrc.supabase.co/functions/v1/policy-source-monitor',
    headers:=jsonb_build_object(
      'Content-Type','application/json',
      'x-hb-monitor-token',(select decrypted_secret from vault.decrypted_secrets where name='policy_source_monitor_token' limit 1)
    ),
    body:=jsonb_build_object('limit',5),
    timeout_milliseconds:=30000
  ) as request_id;
  $cron$
);
