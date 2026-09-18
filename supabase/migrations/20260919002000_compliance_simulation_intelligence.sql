-- Compliance, scenario simulation, notifications and executive intelligence.

create table if not exists public.hb_compliance_controls (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.hb_tenants(id) on delete cascade,
  jurisdiction_code text,
  control_key text not null,
  name text not null,
  description text,
  severity text not null default 'medium' check(severity in ('low','medium','high','critical')),
  evidence_requirements jsonb not null default '[]'::jsonb,
  policy_key text,
  active boolean not null default true,
  unique(tenant_id,jurisdiction_code,control_key)
);

create table if not exists public.hb_compliance_findings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.hb_tenants(id) on delete cascade,
  organization_id uuid references public.hb_organizations(id) on delete cascade,
  case_id uuid references public.hb_cases(id) on delete set null,
  control_id uuid not null references public.hb_compliance_controls(id) on delete restrict,
  status text not null default 'open' check(status in ('open','acknowledged','remediating','resolved','accepted_risk','false_positive')),
  severity text not null check(severity in ('low','medium','high','critical')),
  finding_key text not null,
  evidence_refs jsonb not null default '[]'::jsonb,
  due_at timestamptz,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists public.hb_scenarios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid references public.hb_organizations(id) on delete cascade,
  scenario_type text not null check(scenario_type in ('company_setup','expansion','hiring','residency','cost','compliance','custom')),
  title text not null,
  input jsonb not null,
  status text not null default 'draft' check(status in ('draft','evaluating','ready','archived')),
  created_at timestamptz not null default now()
);

create table if not exists public.hb_scenario_results (
  id uuid primary key default gen_random_uuid(),
  scenario_id uuid not null references public.hb_scenarios(id) on delete cascade,
  option_key text not null,
  jurisdiction_code text,
  estimated_cost jsonb not null default '{}'::jsonb,
  requirements jsonb not null default '[]'::jsonb,
  constraints jsonb not null default '[]'::jsonb,
  assumptions jsonb not null default '[]'::jsonb,
  evidence_refs jsonb not null default '[]'::jsonb,
  confidence text not null default 'unverified' check(confidence in ('unverified','source_backed','rule_validated','human_reviewed')),
  created_at timestamptz not null default now(),
  unique(scenario_id,option_key)
);

create table if not exists public.hb_notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  channels text[] not null default array['in_app'],
  quiet_hours jsonb not null default '{}'::jsonb,
  categories jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.hb_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,
  title text not null,
  body text,
  entity_type text,
  entity_id text,
  priority text not null default 'normal' check(priority in ('low','normal','high','urgent')),
  status text not null default 'unread' check(status in ('unread','read','dismissed')),
  deliver_after timestamptz not null default now(),
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create table if not exists public.hb_metric_snapshots (
  id bigserial primary key,
  tenant_id uuid references public.hb_tenants(id) on delete cascade,
  organization_id uuid references public.hb_organizations(id) on delete cascade,
  metric_key text not null,
  metric_value numeric,
  dimensions jsonb not null default '{}'::jsonb,
  captured_at timestamptz not null default now()
);

create index if not exists hb_compliance_org_status_idx on public.hb_compliance_findings(organization_id,status,severity);
create index if not exists hb_notifications_user_idx on public.hb_notifications(user_id,status,deliver_after);
create index if not exists hb_metric_snapshots_key_time_idx on public.hb_metric_snapshots(metric_key,captured_at desc);

alter table public.hb_compliance_controls enable row level security;
alter table public.hb_compliance_findings enable row level security;
alter table public.hb_scenarios enable row level security;
alter table public.hb_scenario_results enable row level security;
alter table public.hb_notification_preferences enable row level security;
alter table public.hb_notifications enable row level security;
alter table public.hb_metric_snapshots enable row level security;

create policy "compliance controls readable to tenant members" on public.hb_compliance_controls for select using(
  tenant_id is null or public.hb_is_tenant_member(tenant_id)
);
create policy "compliance findings visible to org members" on public.hb_compliance_findings for select using(
  organization_id is not null and public.hb_is_org_member(organization_id)
);
create policy "scenarios owned by user" on public.hb_scenarios for all using(
  user_id=auth.uid()
) with check(user_id=auth.uid());
create policy "scenario results visible through scenario" on public.hb_scenario_results for select using(
  exists(select 1 from public.hb_scenarios s where s.id=scenario_id and s.user_id=auth.uid())
);
create policy "notification preferences owned by user" on public.hb_notification_preferences for all using(
  user_id=auth.uid()
) with check(user_id=auth.uid());
create policy "notifications owned by user" on public.hb_notifications for select using(user_id=auth.uid());
create policy "notifications updated by user" on public.hb_notifications for update using(user_id=auth.uid());
create policy "metrics visible to tenant or org members" on public.hb_metric_snapshots for select using(
  (tenant_id is not null and public.hb_is_tenant_member(tenant_id))
  or (organization_id is not null and public.hb_is_org_member(organization_id))
);

grant select on public.hb_compliance_controls to authenticated;
grant select on public.hb_compliance_findings to authenticated;
grant select,insert,update,delete on public.hb_scenarios to authenticated;
grant select on public.hb_scenario_results to authenticated;
grant select,insert,update,delete on public.hb_notification_preferences to authenticated;
grant select,update on public.hb_notifications to authenticated;
grant select on public.hb_metric_snapshots to authenticated;

revoke insert,update,delete on public.hb_compliance_controls from anon,authenticated;
revoke insert,update,delete on public.hb_compliance_findings from anon,authenticated;
revoke insert,update,delete on public.hb_scenario_results from anon,authenticated;
revoke insert,delete on public.hb_notifications from anon,authenticated;
revoke insert,update,delete on public.hb_metric_snapshots from anon,authenticated;
