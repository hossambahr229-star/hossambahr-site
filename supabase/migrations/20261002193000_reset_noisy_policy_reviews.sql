-- Clear legacy review flags caused by unstable dynamic-page hashes only when the
-- last three successful observations are all different. A stable/repeated change
-- remains review-required and is not touched.
with recent as (
  select r.source_id,r.content_hash,r.checked_at,
         row_number() over(partition by r.source_id order by r.checked_at desc) rn
  from public.hb_policy_source_check_runs r
  where r.error is null and r.http_status between 200 and 399 and r.content_hash is not null
), noisy as (
  select source_id
  from recent
  where rn<=3
  group by source_id
  having count(*)=3 and count(distinct content_hash)=3
)
update public.hb_policy_sources s
set review_required=false,
    monitor_error=null,
    metadata=coalesce(s.metadata,'{}'::jsonb) || jsonb_build_object(
      'review_reset_reason','three_distinct_successive_dynamic_hashes',
      'review_reset_at',now()
    )
where s.active and s.review_required and s.id in (select source_id from noisy);
