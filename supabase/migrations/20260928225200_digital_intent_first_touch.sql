-- Normalize Digital Intent acquisition to one first-touch source per session.
create or replace function hb_private.owner_digital_intent_snapshot(p_days integer default 7)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_days integer := greatest(1, least(coalesce(p_days, 7), 90));
  v_page_views bigint := 0;
  v_sessions bigint := 0;
  v_internal_clicks bigint := 0;
  v_government_clicks bigint := 0;
  v_commercial_clicks bigint := 0;
  v_sources jsonb := '[]'::jsonb;
  v_top_paths jsonb := '[]'::jsonb;
begin
  if not hb_private.is_platform_owner() then
    raise exception 'Permission denied' using errcode='42501';
  end if;

  select
    count(*) filter (where e.event_name='page_view'),
    count(distinct e.session_token) filter (
      where e.event_name='page_view' and e.session_token is not null
    ),
    count(*) filter (
      where e.event_name='cta_click' and e.target_kind='internal'
    ),
    count(*) filter (
      where e.event_name='cta_click' and e.target_kind='government'
    ),
    count(*) filter (
      where e.event_name='cta_click' and e.target_kind='commercial'
    )
  into
    v_page_views,
    v_sessions,
    v_internal_clicks,
    v_government_clicks,
    v_commercial_clicks
  from public.hb_web_analytics_events e
  where e.captured_at >= now() - make_interval(days => v_days)
    and e.path !~ '^/__'
    and coalesce(e.utm_source,'') not in ('analytics_probe','analytics_probe_internal');

  with first_touch as (
    select distinct on (e.session_token)
      e.session_token,
      case
        when nullif(e.utm_source,'') is not null then lower(e.utm_source)
        when lower(coalesce(e.referrer_host,'')) in ('hossambahr.com','www.hossambahr.com') then 'direct_or_unknown'
        when lower(coalesce(e.referrer_host,'')) like '%facebook%' then 'facebook'
        when lower(coalesce(e.referrer_host,'')) like '%google.%' then 'google'
        when lower(coalesce(e.referrer_host,'')) like '%tiktok%' then 'tiktok'
        when nullif(e.referrer_host,'') is not null then lower(e.referrer_host)
        else 'direct_or_unknown'
      end as source
    from public.hb_web_analytics_events e
    where e.captured_at >= now() - make_interval(days => v_days)
      and e.event_name='page_view'
      and e.session_token is not null
      and e.path !~ '^/__'
      and coalesce(e.utm_source,'') not in ('analytics_probe','analytics_probe_internal')
    order by e.session_token, e.captured_at asc, e.id asc
  ),
  source_rollup as (
    select
      f.source,
      count(*)::bigint as sessions,
      count(*) filter (
        where exists (
          select 1
          from public.hb_web_analytics_events c
          where c.session_token=f.session_token
            and c.captured_at >= now() - make_interval(days => v_days)
            and c.event_name='cta_click'
            and c.target_kind='commercial'
        )
      )::bigint as commercial_sessions
    from first_touch f
    group by f.source
  ),
  source_page_views as (
    select
      case
        when nullif(e.utm_source,'') is not null then lower(e.utm_source)
        when lower(coalesce(e.referrer_host,'')) in ('hossambahr.com','www.hossambahr.com') then 'direct_or_unknown'
        when lower(coalesce(e.referrer_host,'')) like '%facebook%' then 'facebook'
        when lower(coalesce(e.referrer_host,'')) like '%google.%' then 'google'
        when lower(coalesce(e.referrer_host,'')) like '%tiktok%' then 'tiktok'
        when nullif(e.referrer_host,'') is not null then lower(e.referrer_host)
        else 'direct_or_unknown'
      end as source,
      count(*)::bigint as page_views
    from public.hb_web_analytics_events e
    where e.captured_at >= now() - make_interval(days => v_days)
      and e.event_name='page_view'
      and e.path !~ '^/__'
      and coalesce(e.utm_source,'') not in ('analytics_probe','analytics_probe_internal')
    group by 1
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'source', s.source,
    'sessions', s.sessions,
    'page_views', coalesce(p.page_views,0),
    'commercial_clicks', s.commercial_sessions
  ) order by s.sessions desc, coalesce(p.page_views,0) desc, s.source), '[]'::jsonb)
  into v_sources
  from source_rollup s
  left join source_page_views p using (source);

  select coalesce(jsonb_agg(jsonb_build_object(
    'path', p.path,
    'sessions', p.sessions,
    'page_views', p.page_views,
    'internal_clicks', p.internal_clicks,
    'commercial_clicks', p.commercial_clicks
  ) order by p.sessions desc, p.page_views desc, p.path), '[]'::jsonb)
  into v_top_paths
  from (
    select
      e.path,
      count(distinct e.session_token) filter (
        where e.event_name='page_view' and e.session_token is not null
      )::bigint as sessions,
      count(*) filter (where e.event_name='page_view')::bigint as page_views,
      count(*) filter (
        where e.event_name='cta_click' and e.target_kind='internal'
      )::bigint as internal_clicks,
      count(*) filter (
        where e.event_name='cta_click' and e.target_kind='commercial'
      )::bigint as commercial_clicks
    from public.hb_web_analytics_events e
    where e.captured_at >= now() - make_interval(days => v_days)
      and e.path !~ '^/__'
      and coalesce(e.utm_source,'') not in ('analytics_probe','analytics_probe_internal')
    group by e.path
    having count(*) filter (where e.event_name='page_view') > 0
    order by sessions desc, page_views desc
    limit 8
  ) p;

  return jsonb_build_object(
    'days', v_days,
    'generated_at', now(),
    'page_views', v_page_views,
    'sessions', v_sessions,
    'internal_clicks', v_internal_clicks,
    'government_clicks', v_government_clicks,
    'commercial_clicks', v_commercial_clicks,
    'commercial_rate', case when v_sessions > 0 then round((v_commercial_clicks::numeric / v_sessions::numeric) * 100, 2) else 0 end,
    'government_rate', case when v_sessions > 0 then round((v_government_clicks::numeric / v_sessions::numeric) * 100, 2) else 0 end,
    'sources', v_sources,
    'top_paths', v_top_paths
  );
end;
$$;
