create or replace function public.hb_internal_kick_global_os_worker(p_reason text default 'api')
returns bigint
language plpgsql
security definer
set search_path=''
as $$
declare
  v_request_id bigint;
begin
  select net.http_post(
    url:='https://ngcrkuykfqmiqhsnpcrc.supabase.co/functions/v1/global-os-worker',
    headers:=jsonb_build_object(
      'Content-Type','application/json',
      'x-hb-worker-token',(
        select decrypted_secret
        from vault.decrypted_secrets
        where name='global_os_worker_token'
        limit 1
      )
    ),
    body:=jsonb_build_object('source','api','reason',left(coalesce(p_reason,'api'),80)),
    timeout_milliseconds:=30000
  )
  into v_request_id;
  return v_request_id;
end;
$$;

revoke all on function public.hb_internal_kick_global_os_worker(text)
from public,anon,authenticated;
grant execute on function public.hb_internal_kick_global_os_worker(text)
to service_role;
