-- First-party, privacy-preserving web analytics for HossamBahr.com.
-- Stores only route/session attribution and coarse CTA categories. No search text or PII.

create table if not exists public.hb_web_analytics_events (
  id bigint generated always as identity primary key,
  event_name text not null
    check (event_name in ('page_view', 'cta_click')),
  path text not null
    check (char_length(path) between 1 and 512),
  session_token text
    check (session_token is null or char_length(session_token) <= 80),
  referrer_host text
    check (referrer_host is null or char_length(referrer_host) <= 253),
  utm_source text
    check (utm_source is null or char_length(utm_source) <= 120),
  utm_medium text
    check (utm_medium is null or char_length(utm_medium) <= 120),
  utm_campaign text
    check (utm_campaign is null or char_length(utm_campaign) <= 160),
  target_kind text
    check (target_kind is null or target_kind in ('commercial', 'government', 'internal')),
  captured_at timestamptz not null default now()
);

create index if not exists hb_web_analytics_events_captured_idx
  on public.hb_web_analytics_events (captured_at desc);
create index if not exists hb_web_analytics_events_path_idx
  on public.hb_web_analytics_events (path, captured_at desc);
create index if not exists hb_web_analytics_events_session_idx
  on public.hb_web_analytics_events (session_token, captured_at desc)
  where session_token is not null;

alter table public.hb_web_analytics_events enable row level security;

drop policy if exists "platform owner reads analytics" on public.hb_web_analytics_events;
create policy "platform owner reads analytics"
on public.hb_web_analytics_events
for select
to authenticated
using (public.hb_is_platform_owner());

revoke all on table public.hb_web_analytics_events from public, anon, authenticated;
grant select on table public.hb_web_analytics_events to authenticated;
grant insert, select on table public.hb_web_analytics_events to service_role;

create or replace function public.hb_web_analytics_summary(p_days integer default 30)
returns table(
  day date,
  page_views bigint,
  sessions bigint,
  commercial_clicks bigint,
  government_clicks bigint,
  internal_clicks bigint
)
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if not public.hb_is_platform_owner() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return query
    select
      (e.captured_at at time zone 'Asia/Dubai')::date as day,
      count(*) filter (where e.event_name = 'page_view')::bigint as page_views,
      count(distinct e.session_token) filter (
        where e.event_name = 'page_view' and e.session_token is not null
      )::bigint as sessions,
      count(*) filter (
        where e.event_name = 'cta_click' and e.target_kind = 'commercial'
      )::bigint as commercial_clicks,
      count(*) filter (
        where e.event_name = 'cta_click' and e.target_kind = 'government'
      )::bigint as government_clicks,
      count(*) filter (
        where e.event_name = 'cta_click' and e.target_kind = 'internal'
      )::bigint as internal_clicks
    from public.hb_web_analytics_events e
    where e.captured_at >= now() - make_interval(days => greatest(1, least(coalesce(p_days, 30), 365)))
      and e.path !~ '^/__'
      and coalesce(e.utm_source, '') <> 'analytics_probe'
    group by 1
    order by 1 desc;
end;
$$;

create or replace function public.hb_web_analytics_top_paths(p_days integer default 30, p_limit integer default 15)
returns table(
  path text,
  page_views bigint,
  sessions bigint,
  commercial_clicks bigint,
  government_clicks bigint,
  internal_clicks bigint
)
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if not public.hb_is_platform_owner() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return query
    select
      e.path,
      count(*) filter (where e.event_name = 'page_view')::bigint as page_views,
      count(distinct e.session_token) filter (
        where e.event_name = 'page_view' and e.session_token is not null
      )::bigint as sessions,
      count(*) filter (
        where e.event_name = 'cta_click' and e.target_kind = 'commercial'
      )::bigint as commercial_clicks,
      count(*) filter (
        where e.event_name = 'cta_click' and e.target_kind = 'government'
      )::bigint as government_clicks,
      count(*) filter (
        where e.event_name = 'cta_click' and e.target_kind = 'internal'
      )::bigint as internal_clicks
    from public.hb_web_analytics_events e
    where e.captured_at >= now() - make_interval(days => greatest(1, least(coalesce(p_days, 30), 365)))
      and e.path !~ '^/__'
      and coalesce(e.utm_source, '') <> 'analytics_probe'
    group by e.path
    having count(*) filter (where e.event_name = 'page_view') > 0
    order by page_views desc, sessions desc, e.path
    limit greatest(1, least(coalesce(p_limit, 15), 100));
end;
$$;

create or replace function public.hb_web_analytics_sources(p_days integer default 30, p_limit integer default 15)
returns table(
  source text,
  medium text,
  referrer_host text,
  page_views bigint,
  sessions bigint,
  commercial_clicks bigint
)
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if not public.hb_is_platform_owner() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return query
    select
      nullif(e.utm_source, '') as source,
      nullif(e.utm_medium, '') as medium,
      case
        when lower(coalesce(e.referrer_host, '')) in ('hossambahr.com','www.hossambahr.com') then null
        else nullif(e.referrer_host, '')
      end as referrer_host,
      count(*) filter (where e.event_name = 'page_view')::bigint as page_views,
      count(distinct e.session_token) filter (
        where e.event_name = 'page_view' and e.session_token is not null
      )::bigint as sessions,
      count(*) filter (
        where e.event_name = 'cta_click' and e.target_kind = 'commercial'
      )::bigint as commercial_clicks
    from public.hb_web_analytics_events e
    where e.captured_at >= now() - make_interval(days => greatest(1, least(coalesce(p_days, 30), 365)))
      and e.path !~ '^/__'
      and coalesce(e.utm_source, '') <> 'analytics_probe'
    group by
      nullif(e.utm_source, ''),
      nullif(e.utm_medium, ''),
      case
        when lower(coalesce(e.referrer_host, '')) in ('hossambahr.com','www.hossambahr.com') then null
        else nullif(e.referrer_host, '')
      end
    order by page_views desc, sessions desc
    limit greatest(1, least(coalesce(p_limit, 15), 100));
end;
$$;

revoke all on function public.hb_web_analytics_summary(integer) from public, anon;
grant execute on function public.hb_web_analytics_summary(integer) to authenticated;

revoke all on function public.hb_web_analytics_top_paths(integer, integer) from public, anon;
grant execute on function public.hb_web_analytics_top_paths(integer, integer) to authenticated;

revoke all on function public.hb_web_analytics_sources(integer, integer) from public, anon;
grant execute on function public.hb_web_analytics_sources(integer, integer) to authenticated;
