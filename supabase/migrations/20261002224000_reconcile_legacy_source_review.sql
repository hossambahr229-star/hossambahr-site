-- Reconcile legacy one-sample dynamic-page hash alerts after confirmed-change monitoring shipped.
with eligible as (
  select s.id from public.hb_policy_sources s
  where s.active=true and s.review_required=true and s.last_http_status=200 and s.monitor_error is null
    and not exists (
      select 1 from public.hb_policy_source_check_runs r
      where r.source_id=s.id and coalesce((r.metadata->>'confirmed_consecutive')::boolean,false)=true
    )
)
update public.hb_policy_sources s
set review_required=false,monitor_failures=0,monitor_error=null,last_verified_at=coalesce(s.last_verified_at,now())
from eligible e where s.id=e.id;

do $$
declare v_bad integer;
begin
  select count(*) into v_bad from public.hb_policy_sources s
  where s.active and s.review_required=false and s.last_http_status=200 and s.monitor_error is null
    and exists(select 1 from public.hb_policy_source_check_runs r where r.source_id=s.id and coalesce((r.metadata->>'confirmed_consecutive')::boolean,false)=true);
  if v_bad>0 then raise exception 'confirmed source changes must remain review-required: %',v_bad; end if;
end $$;
