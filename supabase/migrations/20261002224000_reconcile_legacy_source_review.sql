-- Reconcile legacy one-sample dynamic-page hash alerts after confirmed-change monitoring shipped.
-- Fail closed: only healthy HTTP-200 sources with no confirmed consecutive change are cleared.
update public.hb_policy_sources s
set review_required=false,
    monitor_failures=0,
    monitor_error=null,
    last_verified_at=coalesce(s.last_verified_at,now())
where s.active=true
  and s.review_required=true
  and s.last_http_status=200
  and s.monitor_error is null
  and not exists (
    select 1 from public.hb_policy_source_check_runs r
    where r.source_id=s.id
      and coalesce((r.metadata->>'confirmed_consecutive')::boolean,false)=true
  );

do $$
declare v_unsafe integer;
begin
  select count(*) into v_unsafe
  from public.hb_policy_sources s
  where s.active and not s.review_required
    and (s.last_http_status in (404,410) or s.monitor_failures>=3);
  if v_unsafe>0 then
    raise exception 'unsafe policy sources were cleared from review: %',v_unsafe;
  end if;
end $$;
