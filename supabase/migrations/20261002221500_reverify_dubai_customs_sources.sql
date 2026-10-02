-- Re-verify current official Dubai Customs service pages after monitor review flags.
-- Verified against the live official pages on 2026-10-02.
update public.hb_policy_sources
set review_required=false,last_verified_at=now(),monitor_failures=0,monitor_error=null
where id in (
 '44c3c3ca-3caa-4ee5-b982-49685d0862c1',
 '0cf264e8-7a30-4057-bbb7-2bd769a5b5f5',
 '54a12cd6-698f-4f2f-99eb-248ecd0d643f'
) and active=true and authority_key='dubai-customs' and last_http_status=200;
