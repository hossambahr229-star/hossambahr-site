-- HOSSAM BAHR Global OS production runtime activation and safety fixes
-- 2026-09-30
-- Additive/idempotent: secure public RPC bridges, fix approval audit hashing,
-- keep policy resolution deterministic/source-backed, and ensure the OS worker is scheduled.

-- Public authenticated RPC bridges may call hb_private routines, while authorization
-- remains enforced inside the private routines themselves.
alter function public.hb_submit_user_task(uuid,text) security definer;
alter function public.hb_decide_task_approval(uuid,text,text) security definer;
alter function public.hb_complete_internal_review(uuid,text) security definer;

revoke all on function public.hb_submit_user_task(uuid,text) from public, anon;
revoke all on function public.hb_decide_task_approval(uuid,text,text) from public, anon;
revoke all on function public.hb_complete_internal_review(uuid,text) from public, anon;

grant execute on function public.hb_submit_user_task(uuid,text) to authenticated;
grant execute on function public.hb_decide_task_approval(uuid,text,text) to authenticated;
grant execute on function public.hb_complete_internal_review(uuid,text) to authenticated;

-- pgcrypto lives in the extensions schema in this project. Keep the audit hash;
-- only schema-qualify digest so approvals cannot fail at runtime.
do $$
declare
  v_def text;
begin
  select pg_get_functiondef(p.oid)
    into v_def
  from pg_proc p
  join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='hb_private'
    and p.proname='decide_task_approval'
    and pg_get_function_identity_arguments(p.oid)='p_task_id uuid, p_decision text, p_note text'
  limit 1;

  if v_def is null then
    raise exception 'hb_private.decide_task_approval not found';
  end if;

  if v_def not like '%extensions.digest(%' then
    v_def := replace(v_def,'encode(digest(','encode(extensions.digest(');
    execute v_def;
  end if;
end $$;

-- policy-resolution is deterministic and renders the active source-backed policy.
-- Its model catalog must satisfy the multilingual route capability so the run
-- is labeled with the executor that actually performed the work.
update public.hb_ai_models
set capability_tags = (
  select array_agg(distinct x order by x)
  from unnest(capability_tags || array['multilingual']::text[]) x
)
where model_key='policy-engine-v1'
  and provider='hossambahr'
  and not ('multilingual'=any(capability_tags));

-- Provision a dedicated worker token without exposing it in migrations/logs.
-- If one side exists without the other, fail closed rather than silently rotating.
do $$
declare
  v_token text;
  v_has_hash boolean;
  v_has_secret boolean;
begin
  select exists(
    select 1 from hb_private.internal_worker_tokens where name='global-os-worker'
  ) into v_has_hash;

  select exists(
    select 1 from vault.secrets where name='global_os_worker_token'
  ) into v_has_secret;

  if not v_has_hash and not v_has_secret then
    v_token := encode(extensions.gen_random_bytes(32),'hex');

    insert into hb_private.internal_worker_tokens(name,token_hash,created_at,rotated_at)
    values (
      'global-os-worker',
      encode(extensions.digest(v_token,'sha256'),'hex'),
      now(),
      null
    );

    perform vault.create_secret(
      v_token,
      'global_os_worker_token',
      'HOSSAM BAHR global OS worker cron token',
      null
    );
  elsif v_has_hash <> v_has_secret then
    raise exception 'global OS worker token state is inconsistent; manual reconciliation required';
  end if;
end $$;

-- Schedule the production worker every minute. cron.schedule(name,...) is an upsert
-- for an existing named job in pg_cron.
select cron.schedule(
  'hossambahr-global-os-worker',
  '* * * * *',
  $cron$
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
    body:=jsonb_build_object('source','cron'),
    timeout_milliseconds:=30000
  ) as request_id;
  $cron$
);
