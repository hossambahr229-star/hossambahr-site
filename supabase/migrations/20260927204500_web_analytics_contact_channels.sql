-- Add privacy-safe commercial contact-channel measurement.
-- Stores only a coarse channel label; never a destination URL, phone number, email address, or message text.

alter table public.hb_web_analytics_events
  add column if not exists target_channel text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.hb_web_analytics_events'::regclass
      and conname = 'hb_web_analytics_events_target_channel_check'
  ) then
    alter table public.hb_web_analytics_events
      add constraint hb_web_analytics_events_target_channel_check
      check (target_channel is null or target_channel in ('whatsapp','phone','email','contact'));
  end if;
end
$$;

create or replace function public.hb_web_analytics_channels(
  p_days integer default 30,
  p_limit integer default 10
)
returns table(
  target_channel text,
  clicks bigint,
  sessions bigint
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
      coalesce(e.target_channel, 'unknown') as target_channel,
      count(*)::bigint as clicks,
      count(distinct e.session_token)::bigint as sessions
    from public.hb_web_analytics_events e
    where e.captured_at >= now() - make_interval(days => greatest(1, least(coalesce(p_days, 30), 365)))
      and e.event_name = 'cta_click'
      and e.target_kind = 'commercial'
      and e.path !~ '^/__'
      and coalesce(e.utm_source, '') <> 'analytics_probe'
    group by coalesce(e.target_channel, 'unknown')
    order by clicks desc, sessions desc, target_channel
    limit greatest(1, least(coalesce(p_limit, 10), 20));
end;
$$;

revoke all on function public.hb_web_analytics_channels(integer, integer) from public, anon;
grant execute on function public.hb_web_analytics_channels(integer, integer) to authenticated;
