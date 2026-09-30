create table if not exists hb_private.public_ai_rate_limits (
  fingerprint_hash text not null,
  bucket_start timestamptz not null,
  request_count integer not null default 1,
  updated_at timestamptz not null default now(),
  primary key (fingerprint_hash,bucket_start)
);
revoke all on hb_private.public_ai_rate_limits from public, anon, authenticated;
grant select,insert,update,delete on hb_private.public_ai_rate_limits to service_role;

create or replace function hb_private.public_ai_rate_limit_allow(
  p_fingerprint_hash text,
  p_limit integer default 30
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, hb_private
as $$
declare
  v_bucket timestamptz := date_trunc('hour', now());
  v_count integer;
begin
  if p_fingerprint_hash is null or length(p_fingerprint_hash) < 32 then
    return jsonb_build_object('allowed',false,'remaining',0,'reason','invalid_fingerprint');
  end if;
  delete from hb_private.public_ai_rate_limits where bucket_start < now() - interval '48 hours';
  insert into hb_private.public_ai_rate_limits(fingerprint_hash,bucket_start,request_count,updated_at)
  values(p_fingerprint_hash,v_bucket,1,now())
  on conflict (fingerprint_hash,bucket_start)
  do update set request_count=hb_private.public_ai_rate_limits.request_count+1,updated_at=now()
  returning request_count into v_count;
  return jsonb_build_object(
    'allowed', v_count <= greatest(1,least(coalesce(p_limit,30),120)),
    'remaining', greatest(0,greatest(1,least(coalesce(p_limit,30),120))-v_count),
    'reset_at', v_bucket + interval '1 hour'
  );
end
$$;
revoke all on function hb_private.public_ai_rate_limit_allow(text,integer) from public,anon,authenticated;
grant execute on function hb_private.public_ai_rate_limit_allow(text,integer) to service_role;
