-- Confirm policy-source content changes across two consecutive observations before opening review.
create or replace function public.hb_finish_policy_source_check(
  p_source_id uuid,p_http_status integer default null,p_etag text default null,p_last_modified text default null,
  p_content_hash text default null,p_error text default null,p_duration_ms integer default null
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_source public.hb_policy_sources%rowtype;
  v_changed boolean := false;
  v_candidate boolean := false;
  v_previous_observed_hash text;
  v_failure_count integer;
  v_review boolean;
begin
  select * into v_source from public.hb_policy_sources where id=p_source_id for update;
  if not found then raise exception 'Policy source not found' using errcode='P0002'; end if;

  if p_error is null and coalesce(p_http_status,0) between 200 and 399 then
    v_candidate := v_source.last_content_hash is not null and p_content_hash is not null and v_source.last_content_hash<>p_content_hash;
    if v_candidate then
      select r.content_hash into v_previous_observed_hash
      from public.hb_policy_source_check_runs r
      where r.source_id=p_source_id and r.error is null and r.content_hash is not null
      order by r.checked_at desc limit 1;
      v_changed := v_previous_observed_hash is not null and v_previous_observed_hash=p_content_hash;
    end if;

    update public.hb_policy_sources
    set last_checked_at=now(),monitor_locked_at=null,last_http_status=p_http_status,
        last_etag=coalesce(nullif(p_etag,''),last_etag),
        last_modified_header=coalesce(nullif(p_last_modified,''),last_modified_header),
        last_content_hash=case when not v_candidate or v_changed then coalesce(nullif(p_content_hash,''),last_content_hash) else last_content_hash end,
        last_change_detected_at=case when v_changed then now() else last_change_detected_at end,
        review_required=review_required or v_changed,monitor_failures=0,monitor_error=null
    where id=p_source_id;
    v_failure_count:=0; v_review:=v_source.review_required or v_changed;
  else
    v_failure_count:=v_source.monitor_failures+1;
    v_review:=v_source.review_required or coalesce(p_http_status,0) in (404,410);
    update public.hb_policy_sources
    set last_checked_at=now(),monitor_locked_at=null,last_http_status=p_http_status,
        monitor_failures=v_failure_count,
        monitor_error=left(coalesce(p_error,'http_status_'||coalesce(p_http_status::text,'unknown')),500),
        review_required=v_review where id=p_source_id;
  end if;

  insert into public.hb_policy_source_check_runs(source_id,http_status,etag,last_modified_header,content_hash,changed,error,duration_ms,metadata)
  values(p_source_id,p_http_status,nullif(p_etag,''),nullif(p_last_modified,''),nullif(p_content_hash,''),v_changed,left(p_error,500),p_duration_ms,
    jsonb_build_object('verification_changed',false,'monitor_only',true,'candidate_change',v_candidate,'confirmed_consecutive',v_changed));

  return jsonb_build_object('source_id',p_source_id,'changed',v_changed,'candidate_change',v_candidate,'review_required',v_review,'monitor_failures',v_failure_count);
end; $$;
revoke all on function public.hb_finish_policy_source_check(uuid,integer,text,text,text,text,integer) from public,anon,authenticated;
grant execute on function public.hb_finish_policy_source_check(uuid,integer,text,text,text,text,integer) to service_role;

-- These exact official service pages were manually re-verified on 2026-10-02 after noisy dynamic-page hash alerts.
update public.hb_policy_sources
set review_required=false,last_verified_at=now(),monitor_failures=0,monitor_error=null
where id in (
 '45cff890-24fd-42ed-8059-045184b8ac71',
 'c7be65e8-8cf5-4679-8b50-0bde15cf4b3c',
 'a7affbbe-d1af-4634-9e5f-89bdebc15be8',
 'd1dccfa1-51c7-42f9-b781-514c27ef27db'
) and active=true and last_http_status=200;
