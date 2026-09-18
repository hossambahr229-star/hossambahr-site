-- Operations control plane: queues, SLA policies, assignments, case events and agent execution plans.

create table if not exists public.hb_work_queues (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.hb_tenants(id) on delete cascade,
  queue_key text not null,
  name text not null,
  jurisdiction_codes text[] not null default '{}',
  service_tags text[] not null default '{}',
  active boolean not null default true,
  unique(tenant_id,queue_key)
);

create table if not exists public.hb_sla_policies (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.hb_tenants(id) on delete cascade,
  policy_key text not null,
  case_type text,
  priority text,
  first_response_minutes integer check(first_response_minutes is null or first_response_minutes>=0),
  target_completion_minutes integer check(target_completion_minutes is null or target_completion_minutes>=0),
  escalation_after_minutes integer check(escalation_after_minutes is null or escalation_after_minutes>=0),
  active boolean not null default true,
  unique(tenant_id,policy_key)
);

create table if not exists public.hb_assignments (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.hb_cases(id) on delete cascade,
  task_id uuid references public.hb_case_tasks(id) on delete cascade,
  queue_id uuid references public.hb_work_queues(id) on delete set null,
  assignee_type text not null check(assignee_type in ('staff','partner','agent','system')),
  assignee_ref text not null,
  status text not null default 'assigned' check(status in ('assigned','accepted','working','completed','released')),
  assigned_at timestamptz not null default now(),
  accepted_at timestamptz,
  completed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.hb_case_events (
  id bigserial primary key,
  case_id uuid not null references public.hb_cases(id) on delete cascade,
  event_type text not null,
  actor_type text not null check(actor_type in ('user','staff','partner','agent','system','integration')),
  actor_ref text,
  payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create table if not exists public.hb_agent_execution_plans (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.hb_tenants(id) on delete cascade,
  case_id uuid not null references public.hb_cases(id) on delete cascade,
  orchestrator_agent_id uuid references public.hb_agents(id) on delete restrict,
  status text not null default 'draft' check(status in ('draft','review','approved','executing','completed','failed','cancelled')),
  plan jsonb not null,
  risk_summary jsonb not null default '{}'::jsonb,
  requires_human_approval boolean not null default true,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists hb_assignments_case_status_idx on public.hb_assignments(case_id,status);
create index if not exists hb_case_events_case_time_idx on public.hb_case_events(case_id,occurred_at desc);
create index if not exists hb_execution_plans_case_idx on public.hb_agent_execution_plans(case_id,status);

alter table public.hb_work_queues enable row level security;
alter table public.hb_sla_policies enable row level security;
alter table public.hb_assignments enable row level security;
alter table public.hb_case_events enable row level security;
alter table public.hb_agent_execution_plans enable row level security;

create policy "work queues visible to tenant members" on public.hb_work_queues for select using(
  tenant_id is null or public.hb_is_tenant_member(tenant_id)
);
create policy "SLA policies visible to tenant members" on public.hb_sla_policies for select using(
  tenant_id is null or public.hb_is_tenant_member(tenant_id)
);
create policy "assignments visible through case" on public.hb_assignments for select using(
  exists(
    select 1 from public.hb_cases c
    where c.id=case_id and (
      c.user_id=auth.uid()
      or (c.organization_id is not null and public.hb_is_org_member(c.organization_id))
      or (c.tenant_id is not null and public.hb_is_tenant_member(c.tenant_id))
    )
  )
);
create policy "case events visible through case" on public.hb_case_events for select using(
  exists(
    select 1 from public.hb_cases c
    where c.id=case_id and (
      c.user_id=auth.uid()
      or (c.organization_id is not null and public.hb_is_org_member(c.organization_id))
      or (c.tenant_id is not null and public.hb_is_tenant_member(c.tenant_id))
    )
  )
);
create policy "execution plans visible through case" on public.hb_agent_execution_plans for select using(
  exists(
    select 1 from public.hb_cases c
    where c.id=case_id and (
      c.user_id=auth.uid()
      or (c.organization_id is not null and public.hb_is_org_member(c.organization_id))
      or (c.tenant_id is not null and public.hb_is_tenant_member(c.tenant_id))
    )
  )
);

grant select on public.hb_work_queues to authenticated;
grant select on public.hb_sla_policies to authenticated;
grant select on public.hb_assignments to authenticated;
grant select on public.hb_case_events to authenticated;
grant select on public.hb_agent_execution_plans to authenticated;

revoke insert,update,delete on public.hb_work_queues from anon,authenticated;
revoke insert,update,delete on public.hb_sla_policies from anon,authenticated;
revoke insert,update,delete on public.hb_assignments from anon,authenticated;
revoke insert,update,delete on public.hb_case_events from anon,authenticated;
revoke insert,update,delete on public.hb_agent_execution_plans from anon,authenticated;
