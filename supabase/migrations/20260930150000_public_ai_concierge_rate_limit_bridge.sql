create or replace function public.hb_public_ai_rate_limit_allow(
  p_fingerprint_hash text,
  p_limit integer default 30
)
returns jsonb
language sql
security definer
set search_path = pg_catalog, public, hb_private
as $$
  select hb_private.public_ai_rate_limit_allow(p_fingerprint_hash,p_limit);
$$;
revoke all on function public.hb_public_ai_rate_limit_allow(text,integer) from public,anon,authenticated;
grant execute on function public.hb_public_ai_rate_limit_allow(text,integer) to service_role;
