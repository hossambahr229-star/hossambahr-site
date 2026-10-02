-- Transport timeouts are monitor-health failures, not evidence that an official source is unsafe.
create or replace function public.hb_policy_source_is_safe(p_source_id uuid)
returns boolean language sql stable security invoker set search_path='' as $$
 select exists(
   select 1 from public.hb_policy_sources s
   where s.id=p_source_id and s.active=true and s.review_required=false
     and not (coalesce(s.last_http_status,0) in (404,410))
 );
$$;
revoke all on function public.hb_policy_source_is_safe(uuid) from public,anon;
grant execute on function public.hb_policy_source_is_safe(uuid) to authenticated,service_role;
comment on function public.hb_policy_source_is_safe(uuid) is
'Fail closed for inactive, review-required, 404/410 sources. Repeated monitor transport timeouts remain observable health failures but do not by themselves invalidate previously verified official policy evidence.';
