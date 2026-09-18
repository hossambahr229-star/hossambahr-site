-- Standing authorization and safe automation control plane.

create table if not exists public.hb_standing_authorizations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tenant_id uuid references public.hb_tenants(id) on delete cascade,
  organization_id uuid references public.hb_organizations(id) on delete cascade,
  authorization_key text not null,
  name text not null,
  purpose text not null,
  allowed_scopes text[] not null default '{}',
  denied_scopes text[] not null default '{}',
  allowed_action_classes text[] not null default '{}',
  max_risk_level text not null default 'low' check(max_risk_level in ('low','medium')),
  status text not null default 'active' check(status in ('active','paused','revoked','expired')),
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id,authorization_key)
);

create table if not exists public.hb_automation_policies (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.hb_tenants(id) on delete cascade,
  organization_id uuid references public.hb_organizations(id) on delete cascade,
  owner_user_id uuid references auth.users(id) on delete cascade,
  policy_key text not null,
  name text not null,
  trigger_type text not null check(trigger_type in ('event','schedule','condition')),
  trigger_spec jsonb not null default '{}'::jsonb,
  action_type text not null,
  action_spec jsonb not null default '{}'::jsonb,
  required_scope text not null,
  risk_class text not null default 'low' check(risk_class in ('low','medium','high','critical')),
  requires_standing_authorization boolean not null default true,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_user_id,policy_key)
);

create table if not exists public.hb_automation_runs (
  id uuid primary key default gen_random_uuid(),
  policy_id uuid not null references public.hb_automation_policies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid references public.hb_organizations(id) on delete set null,
  case_id uuid references public.hb_cases(id) on delete set null,
  authorization_id uuid references public.hb_standing_authorizations(id) on delete set null,
  status text not null default 'queued' check(status in ('queued','running','completed','failed','blocked','needs_approval','cancelled')),
  idempotency_key text not null unique,
  input jsonb not null default '{}'::jsonb,
  output jsonb not null default '{}'::jsonb,
  block_reason text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.hb_automation_events (
  id bigserial primary key,
  automation_run_id uuid not null references public.hb_automation_runs(id) on delete cascade,
  event_type text not null,
  actor_type text not null check(actor_type in ('system','agent','integration','staff')),
  actor_ref text,
  payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create index if not exists hb_standing_authorization_user_idx
on public.hb_standing_authorizations(user_id,status,valid_until);

create index if not exists hb_automation_policy_owner_idx
on public.hb_automation_policies(owner_user_id,enabled);

create index if not exists hb_automation_run_queue_idx
on public.hb_automation_runs(status,created_at);

alter table public.hb_standing_authorizations enable row level security;
alter table public.hb_automation_policies enable row level security;
alter table public.hb_automation_runs enable row level security;
alter table public.hb_automation_events enable row level security;

create policy "standing authorizations owned by user"
on public.hb_standing_authorizations for all
using (
  user_id=auth.uid()
  and (organization_id is null or public.hb_is_org_member(organization_id))
)
with check (
  user_id=auth.uid()
  and (organization_id is null or public.hb_is_org_member(organization_id))
);

create policy "automation policies visible to owner"
on public.hb_automation_policies for select
using (
  owner_user_id=auth.uid()
  or (organization_id is not null and public.hb_is_org_member(organization_id))
);

create policy "automation runs visible to owner"
on public.hb_automation_runs for select
using (
  user_id=auth.uid()
  or (organization_id is not null and public.hb_is_org_member(organization_id))
);

create policy "automation events visible through run"
on public.hb_automation_events for select
using (
  exists(
    select 1 from public.hb_automation_runs r
    where r.id=automation_run_id
      and (
        r.user_id=auth.uid()
        or (r.organization_id is not null and public.hb_is_org_member(r.organization_id))
      )
  )
);

grant select,insert,update,delete on public.hb_standing_authorizations to authenticated;
grant select on public.hb_automation_policies to authenticated;
grant select on public.hb_automation_runs to authenticated;
grant select on public.hb_automation_events to authenticated;

revoke insert,update,delete on public.hb_automation_policies from anon,authenticated;
revoke insert,update,delete on public.hb_automation_runs from anon,authenticated;
revoke insert,update,delete on public.hb_automation_events from anon,authenticated;

-- Explicitly prevent broad standing authorization from replacing sensitive approvals.
create or replace function public.hb_scope_is_always_sensitive(p_scope text)
returns boolean
language sql
immutable
set search_path=''
as $$
  select p_scope = any(array[
    'payment:capture',
    'payment:refund',
    'bank:transfer',
    'government:submit',
    'signature:apply',
    'contract:sign',
    'consent:grant',
    'consent:revoke',
    'organization:delete',
    'case:delete',
    'document:delete',
    'credential:revoke',
    'policy:publish',
    'finding:accept_risk'
  ]::text[]);
$$;

grant execute on function public.hb_scope_is_always_sensitive(text) to authenticated,service_role;

create or replace function public.hb_effective_standing_authorization(
  p_user_id uuid,
  p_scope text,
  p_organization_id uuid default null
)
returns uuid
language sql
stable
security definer
set search_path=''
as $$
  select a.id
  from public.hb_standing_authorizations a
  where a.user_id=p_user_id
    and a.status='active'
    and a.valid_from<=now()
    and (a.valid_until is null or a.valid_until>now())
    and (a.organization_id is null or a.organization_id=p_organization_id)
    and p_scope=any(a.allowed_scopes)
    and not p_scope=any(a.denied_scopes)
    and not public.hb_scope_is_always_sensitive(p_scope)
  order by a.created_at desc
  limit 1;
$$;

revoke all on function public.hb_effective_standing_authorization(uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.hb_effective_standing_authorization(uuid,text,uuid) to service_role;
