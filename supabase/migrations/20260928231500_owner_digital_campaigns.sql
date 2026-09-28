-- Owner-only campaign attribution for first-party Digital Intent.
-- Campaigns remain website intent signals; they do not create CRM leads.

create or replace function hb_private.owner_digital_campaigns(p_days integer default 7)
returns jsonb
language plpgsql
stable
security definer
set search_path=''
as $$
declare
  v_days integer := greatest(1, least(coalesce(p_days, 7), 90));
  v_result jsonb := '[]'::jsonb;
begin
  if not hb_private.is_platform_owner() then
    raise exception 'Permission denied' using errcode='42501';
  end if;

  with session_campaign as (
    select distinct on (e.session_token)
      e.session_token,
      nullif(e.utm_campaign,'') as campaign,
      lower(coalesce(nullif(e.utm_source,''),'direct_or_unknown')) as source,
      e.captured_at
    from public.hb_web_analytics_events e
    where e.captured_at >= now() - make_interval(days => v_days)
      and e.event_name='page_view'
      and e.session_token is not null
      and nullif(e.utm_campaign,'') is not null
      and e.path !~ '^/__'
      and coalesce(e.utm_source,'') not in ('analytics_probe','analytics_probe_internal')
    order by e.session_token,e.captured_at asc,e.id asc
  ),
  rollup as (
    select
      sc.campaign,
      sc.source,
      count(*)::bigint as sessions,
      count(*) filter (
        where exists (
          select 1 from public.hb_web_analytics_events e
          where e.session_token=sc.session_token
            and e.captured_at >= now() - make_interval(days => v_days)
            and e.event_name='cta_click'
            and e.target_kind='internal'
        )
      )::bigint as engaged_sessions,
      count(*) filter (
        where exists (
          select 1 from public.hb_web_analytics_events e
          where e.session_token=sc.session_token
            and e.captured_at >= now() - make_interval(days => v_days)
            and e.event_name='cta_click'
            and e.target_kind='government'
        )
      )::bigint as government_sessions,
      count(*) filter (
        where exists (
          select 1 from public.hb_web_analytics_events e
          where e.session_token=sc.session_token
            and e.captured_at >= now() - make_interval(days => v_days)
            and e.event_name='cta_click'
            and e.target_kind='commercial'
        )
      )::bigint as commercial_sessions
    from session_campaign sc
    group by sc.campaign,sc.source
  )
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'campaign',r.campaign,
      'source',r.source,
      'sessions',r.sessions,
      'engaged_sessions',r.engaged_sessions,
      'government_sessions',r.government_sessions,
      'commercial_sessions',r.commercial_sessions,
      'commercial_rate',case when r.sessions>0 then round((r.commercial_sessions::numeric/r.sessions::numeric)*100,2) else 0 end
    )
    order by r.sessions desc,r.commercial_sessions desc,r.campaign
  ),'[]'::jsonb)
  into v_result
  from rollup r;

  return v_result;
end;
$$;

revoke all on function hb_private.owner_digital_campaigns(integer) from public,anon;
grant execute on function hb_private.owner_digital_campaigns(integer) to authenticated;

create or replace function public.hb_owner_digital_campaigns(p_days integer default 7)
returns jsonb
language sql
stable
security invoker
set search_path=''
as $$
  select hb_private.owner_digital_campaigns(p_days)
$$;

revoke all on function public.hb_owner_digital_campaigns(integer) from public,anon;
grant execute on function public.hb_owner_digital_campaigns(integer) to authenticated;
