-- Event-driven agent execution: seed controlled agents and transactional outbox claims.

insert into public.hb_agents(key,name,purpose,allowed_scopes,requires_human_approval_for)
values
('intake','Intake Agent','Structure user goals into case intake',array['case:read','case:draft','service:read','jurisdiction:read'],array['external_submission']),
('policy','Policy Agent','Resolve source-backed rules and requirements',array['policy:read','source:read','case:read'],array['policy_publish']),
('document','Document Agent','Classify and inspect private documents',array['document:read','document:extract','case:read'],array['document_delete']),
('planner','Case Planner','Compile workflows into tasks',array['workflow:read','case:read','task:draft'],array['task_approve','external_submission']),
('quality','Quality Agent','Check completeness and contradictions',array['case:read','task:read','document:read','audit:read'],array['external_submission']),
('finance','Finance Agent','Analyze finance without moving money',array['finance:read','quote:read','payment:read','ledger:read','metric:read'],array['payment_capture','payment_refund','bank_transfer']),
('operations','Operations Agent','Analyze queues SLA and workload',array['case:read','task:read','assignment:read','sla:read','metric:read'],array['task_approve']),
('compliance','Compliance Agent','Assess controls and evidence gaps',array['policy:read','source:read','case:read','document:read','compliance:read','finding:draft'],array['finding_accept_risk','policy_publish']),
('growth','Growth Agent','Analyze CRM funnels and draft growth work',array['lead:read','metric:read','campaign:draft','content:draft'],array['message_send','campaign_publish'])
on conflict(key) do update set
  name=excluded.name,
  purpose=excluded.purpose,
  allowed_scopes=excluded.allowed_scopes,
  requires_human_approval_for=excluded.requires_human_approval_for;

create or replace function public.hb_emit_case_created()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
begin
  insert into public.hb_outbox_events(
    aggregate_type,aggregate_id,event_type,payload,destination,status
  )
  values(
    'case',
    new.id::text,
    'case.created',
    jsonb_build_object(
      'case_id',new.id,
      'user_id',new.user_id,
      'organization_id',new.organization_id,
      'tenant_id',new.tenant_id,
      'service_slug',new.service_slug,
      'goal',new.goal
    ),
    'agent-orchestrator',
    'pending'
  );
  return new;
end;
$$;

revoke all on function public.hb_emit_case_created() from public,anon,authenticated;

drop trigger if exists hb_case_created_outbox on public.hb_cases;
create trigger hb_case_created_outbox
after insert on public.hb_cases
for each row execute function public.hb_emit_case_created();

create or replace function public.hb_claim_outbox_event()
returns setof public.hb_outbox_events
language plpgsql
security definer
set search_path=''
as $$
begin
  return query
  with candidate as (
    select e.id
    from public.hb_outbox_events e
    where e.status='pending'
      and e.available_at<=now()
    order by e.created_at
    for update skip locked
    limit 1
  )
  update public.hb_outbox_events e
  set status='processing',
      attempts=e.attempts+1,
      locked_at=now()
  from candidate c
  where e.id=c.id
  returning e.*;
end;
$$;

create or replace function public.hb_finish_outbox_event(
  p_event_id uuid,
  p_success boolean,
  p_error text default null
)
returns void
language plpgsql
security definer
set search_path=''
as $$
begin
  update public.hb_outbox_events
  set status=case
      when p_success then 'delivered'
      when attempts>=8 then 'dead_letter'
      else 'pending'
    end,
    delivered_at=case when p_success then now() else delivered_at end,
    last_error=case when p_success then null else left(coalesce(p_error,'unknown failure'),2000) end,
    available_at=case
      when p_success then available_at
      else now() + make_interval(secs => least(900, greatest(1, power(2, least(attempts,10))::integer)))
    end,
    locked_at=null
  where id=p_event_id;
end;
$$;

revoke all on function public.hb_claim_outbox_event() from public,anon,authenticated;
revoke all on function public.hb_finish_outbox_event(uuid,boolean,text) from public,anon,authenticated;
grant execute on function public.hb_claim_outbox_event() to service_role;
grant execute on function public.hb_finish_outbox_event(uuid,boolean,text) to service_role;
