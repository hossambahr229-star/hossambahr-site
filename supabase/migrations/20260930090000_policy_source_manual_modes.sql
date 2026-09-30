-- Classify official policy sources that are not reachable from Supabase Edge
-- as manual monitoring. This is a transport limitation, not a policy failure.

update public.hb_policy_sources
set monitor_enabled=false,
    monitor_locked_at=null,
    monitor_error=null,
    monitor_failures=0,
    metadata=metadata || jsonb_build_object(
      'monitor_mode','manual',
      'monitor_reason','official_site_unreachable_from_supabase_edge',
      'monitor_mode_set_at',now()
    )
where active=true
  and source_type='official'
  and lower(split_part(split_part(source_url,'://',2),'/',1)) in (
    'mohre.gov.ae',
    'www.mohre.gov.ae',
    'digital.fujairah.ae',
    'nafis.gov.ae'
  );

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
    'sources_total',count(*) filter(where active and source_type='official'),
    'automatic_sources',count(*) filter(where active and source_type='official' and monitor_enabled=true),
    'manual_sources',count(*) filter(where active and source_type='official' and monitor_enabled=false),
    'review_required',count(*) filter(where active and source_type='official' and review_required),
    'never_checked',count(*) filter(where active and source_type='official' and monitor_enabled=true and last_checked_at is null),
    'checked_24h',count(*) filter(where active and source_type='official' and monitor_enabled=true and last_checked_at>=now()-interval '24 hours'),
    'failed',count(*) filter(where active and source_type='official' and monitor_enabled=true and monitor_failures>0),
    'hard_failures',count(*) filter(where active and source_type='official' and monitor_enabled=true and last_http_status in (404,410)),
    'oldest_check',min(last_checked_at) filter(where active and source_type='official' and monitor_enabled=true),
    'newest_check',max(last_checked_at) filter(where active and source_type='official' and monitor_enabled=true)
  )
  into v_payload
  from public.hb_policy_sources;

  return v_payload;
end;
$$;
