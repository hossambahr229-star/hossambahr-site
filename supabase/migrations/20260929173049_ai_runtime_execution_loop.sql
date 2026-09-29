-- Production AI runtime execution loop.
-- Mirrors Supabase migration 20260929173049_ai_runtime_execution_loop.

alter table public.hb_agent_jobs
  add column if not exists attempts integer not null default 0,
  add column if not exists locked_at timestamptz;

create index if not exists hb_agent_jobs_dispatch_idx
  on public.hb_agent_jobs(status, available_at, priority desc, created_at);

create or replace function public.hb_claim_agent_job()
returns setof public.hb_agent_jobs
language plpgsql
security definer
set search_path=''
as $$
begin
  return query
  with candidate as (
    select j.id
    from public.hb_agent_jobs j
    where j.status='queued' and j.available_at<=now()
    order by j.priority desc, j.created_at
    for update skip locked
    limit 1
  )
  update public.hb_agent_jobs j
  set status='running', attempts=j.attempts+1, started_at=now(), locked_at=now(), last_error=null
  from candidate c
  where j.id=c.id
  returning j.*;
end;
$$;

create or replace function public.hb_finish_agent_job(
  p_job_id uuid,
  p_success boolean,
  p_run_id uuid default null,
  p_error text default null,
  p_retryable boolean default false
)
returns void
language plpgsql
security definer
set search_path=''
as $$
begin
  update public.hb_agent_jobs
  set status=case
      when p_success then 'completed'
      when p_retryable and attempts < 3 then 'queued'
      else 'failed'
    end,
    completed_at=case
      when p_success or not (p_retryable and attempts < 3) then now()
      else null
    end,
    result_ref=case
      when p_run_id is not null then 'agent_run:' || p_run_id::text
      else result_ref
    end,
    last_error=case
      when p_success then null
      else left(coalesce(p_error,'unknown agent failure'),2000)
    end,
    available_at=case
      when p_success then available_at
      when p_retryable and attempts < 3 then now() + make_interval(secs => least(30, greatest(2, power(2, attempts)::integer)))
      else available_at
    end,
    started_at=case
      when p_retryable and attempts < 3 and not p_success then null
      else started_at
    end,
    locked_at=null
  where id=p_job_id;
end;
$$;

create or replace function public.hb_recover_stale_agent_jobs(p_timeout_seconds integer default 240)
returns integer
language plpgsql
security definer
set search_path=''
as $$
declare affected integer;
begin
  update public.hb_agent_jobs
  set status=case when attempts < 3 then 'queued' else 'failed' end,
      available_at=case when attempts < 3 then now() else available_at end,
      started_at=case when attempts < 3 then null else started_at end,
      completed_at=case when attempts < 3 then null else now() end,
      last_error='stale_execution_recovered',
      locked_at=null
  where status='running'
    and locked_at is not null
    and locked_at < now() - make_interval(secs => greatest(60,p_timeout_seconds));
  get diagnostics affected = row_count;
  return affected;
end;
$$;

revoke all on function public.hb_claim_agent_job() from public,anon,authenticated;
revoke all on function public.hb_finish_agent_job(uuid,boolean,uuid,text,boolean) from public,anon,authenticated;
revoke all on function public.hb_recover_stale_agent_jobs(integer) from public,anon,authenticated;
grant execute on function public.hb_claim_agent_job() to service_role;
grant execute on function public.hb_finish_agent_job(uuid,boolean,uuid,text,boolean) to service_role;
grant execute on function public.hb_recover_stale_agent_jobs(integer) to service_role;

insert into public.hb_ai_models(provider,model_key,capability_tags,allowed_data_classes,regions,status,metadata)
values
('openai','gpt-5.6-luna',array['text','reasoning','multilingual','structured_output'],array['public','internal'],array[]::text[],'active','{"api":"responses","store":false,"secret_env":"OPENAI_API_KEY","tier":"cost_optimized","reasoning_effort":"low"}'::jsonb),
('openai','gpt-5.6-sol',array['text','reasoning','multilingual','structured_output','high_reasoning'],array['public','internal'],array[]::text[],'active','{"api":"responses","store":false,"secret_env":"OPENAI_API_KEY","tier":"frontier","reasoning_effort":"medium"}'::jsonb)
on conflict(provider,model_key) do update set
  capability_tags=excluded.capability_tags,
  allowed_data_classes=excluded.allowed_data_classes,
  regions=excluded.regions,
  status=excluded.status,
  metadata=excluded.metadata;

insert into public.hb_ai_routes(route_key,task_type,preferred_models,required_capabilities,max_data_class,require_region,require_human_review,active,metadata)
values
('case-intake','intake','[{"provider":"openai","modelKey":"gpt-5.6-luna"},{"provider":"openai","modelKey":"gpt-5.6-sol"}]'::jsonb,array['text','multilingual','structured_output'],'internal',null,false,true,'{"purpose":"Structure a new case without taking external action","data_minimization":true}'::jsonb),
('policy-resolution','policy','[{"provider":"openai","modelKey":"gpt-5.6-sol"},{"provider":"openai","modelKey":"gpt-5.6-luna"}]'::jsonb,array['text','reasoning','multilingual','structured_output'],'internal',null,false,true,'{"purpose":"Explain only database-backed policy context; never invent rules"}'::jsonb),
('case-planning','planner','[{"provider":"openai","modelKey":"gpt-5.6-sol"},{"provider":"openai","modelKey":"gpt-5.6-luna"}]'::jsonb,array['text','reasoning','structured_output'],'internal',null,false,true,'{"purpose":"Draft a case plan from an approved workflow template"}'::jsonb),
('quality-check','quality','[{"provider":"openai","modelKey":"gpt-5.6-sol"},{"provider":"openai","modelKey":"gpt-5.6-luna"}]'::jsonb,array['text','reasoning','structured_output'],'internal',null,true,true,'{"purpose":"Check completeness and contradictions only"}'::jsonb),
('operations-analysis','operations','[{"provider":"openai","modelKey":"gpt-5.6-luna"},{"provider":"openai","modelKey":"gpt-5.6-sol"}]'::jsonb,array['text','reasoning','structured_output'],'internal',null,false,true,'{"purpose":"Analyze queues and SLA risk without approving tasks"}'::jsonb),
('growth-analysis','growth','[{"provider":"openai","modelKey":"gpt-5.6-luna"},{"provider":"openai","modelKey":"gpt-5.6-sol"}]'::jsonb,array['text','reasoning','structured_output'],'internal',null,true,true,'{"purpose":"Draft growth actions; never send messages autonomously"}'::jsonb),
('finance-analysis','finance','[{"provider":"openai","modelKey":"gpt-5.6-sol"},{"provider":"openai","modelKey":"gpt-5.6-luna"}]'::jsonb,array['text','reasoning','structured_output'],'internal',null,true,true,'{"purpose":"Analyze finance without moving money"}'::jsonb),
('compliance-analysis','compliance','[{"provider":"openai","modelKey":"gpt-5.6-sol"},{"provider":"openai","modelKey":"gpt-5.6-luna"}]'::jsonb,array['text','reasoning','structured_output'],'internal',null,true,true,'{"purpose":"Draft compliance findings for review"}'::jsonb),
('document-analysis','document','[{"provider":"openai","modelKey":"gpt-5.6-sol"}]'::jsonb,array['text','reasoning','structured_output'],'confidential',null,true,false,'{"purpose":"Reserved for private-document analysis","blocked_reason":"confidential_data_route_not_yet_approved"}'::jsonb)
on conflict(route_key) do update set
  task_type=excluded.task_type,
  preferred_models=excluded.preferred_models,
  required_capabilities=excluded.required_capabilities,
  max_data_class=excluded.max_data_class,
  require_region=excluded.require_region,
  require_human_review=excluded.require_human_review,
  active=excluded.active,
  metadata=excluded.metadata;
