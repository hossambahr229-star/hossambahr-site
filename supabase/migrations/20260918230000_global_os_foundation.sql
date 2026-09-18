-- HOSSAM BAHR Global OS foundation
-- Safe additive migration. Existing profiles/user_transactions remain untouched.

create extension if not exists pgcrypto;

create table if not exists public.hb_jurisdictions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name_ar text,
  name_en text not null,
  level text not null check (level in ('country','state','emirate','province','city','zone')),
  parent_id uuid references public.hb_jurisdictions(id) on delete restrict,
  default_currency text,
  default_locale text,
  data_residency_region text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.hb_organizations (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete restrict,
  legal_name text not null,
  trade_name text,
  jurisdiction_id uuid references public.hb_jurisdictions(id),
  registration_number text,
  lifecycle_status text not null default 'active' check (lifecycle_status in ('draft','active','suspended','closed')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.hb_organization_members (
  organization_id uuid not null references public.hb_organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','admin','operator','finance','viewer')),
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table if not exists public.hb_cases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  organization_id uuid references public.hb_organizations(id) on delete set null,
  jurisdiction_id uuid references public.hb_jurisdictions(id),
  service_slug text,
  goal text,
  title text not null,
  status text not null default 'draft' check (status in ('draft','qualifying','waiting_customer','ready_for_review','approved','in_progress','waiting_external','blocked','completed','cancelled')),
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  readiness_percent integer not null default 0 check (readiness_percent between 0 and 100),
  risk_level text not null default 'unknown' check (risk_level in ('unknown','low','medium','high')),
  due_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.hb_case_tasks (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.hb_cases(id) on delete cascade,
  title text not null,
  task_type text not null default 'manual',
  status text not null default 'todo' check (status in ('todo','in_progress','waiting','needs_approval','done','cancelled')),
  assignee_type text check (assignee_type in ('user','staff','partner','agent','system','integration')),
  assignee_ref text,
  requires_approval boolean not null default false,
  dependency_ids uuid[] not null default '{}',
  due_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.hb_documents (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete restrict,
  organization_id uuid references public.hb_organizations(id) on delete set null,
  case_id uuid references public.hb_cases(id) on delete set null,
  document_type text not null,
  storage_path text not null,
  original_filename text,
  issuing_country text,
  issued_at date,
  expires_at date,
  verification_status text not null default 'unverified' check (verification_status in ('unverified','source_backed','rule_validated','human_reviewed','rejected')),
  extracted_data jsonb not null default '{}'::jsonb,
  checksum text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.hb_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid references public.hb_organizations(id) on delete cascade,
  grantee_type text not null check (grantee_type in ('staff','partner','agent','integration')),
  grantee_ref text not null,
  purpose text not null,
  scopes text[] not null,
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.hb_obligations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid references public.hb_organizations(id) on delete cascade,
  source_document_id uuid references public.hb_documents(id) on delete set null,
  obligation_type text not null,
  title text not null,
  due_at timestamptz not null,
  status text not null default 'open' check (status in ('open','snoozed','completed','cancelled')),
  related_case_id uuid references public.hb_cases(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.hb_agents (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  purpose text not null,
  allowed_scopes text[] not null default '{}',
  requires_human_approval_for text[] not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.hb_agent_runs (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.hb_agents(id) on delete restrict,
  user_id uuid references auth.users(id) on delete set null,
  case_id uuid references public.hb_cases(id) on delete set null,
  provider text,
  model text,
  purpose text not null,
  status text not null check (status in ('started','completed','failed','blocked_for_approval')),
  confidence text not null default 'unverified' check (confidence in ('unverified','source_backed','rule_validated','human_reviewed')),
  input_refs jsonb not null default '[]'::jsonb,
  output_summary jsonb not null default '{}'::jsonb,
  human_approved_by uuid references auth.users(id) on delete set null,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.hb_audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_type text not null check (actor_type in ('user','staff','partner','agent','system','integration')),
  actor_ref text,
  user_id uuid references auth.users(id) on delete set null,
  organization_id uuid references public.hb_organizations(id) on delete set null,
  entity_type text not null,
  entity_id text not null,
  action text not null,
  ip_hash text,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create index if not exists hb_cases_user_status_idx on public.hb_cases(user_id, status, created_at desc);
create index if not exists hb_cases_org_status_idx on public.hb_cases(organization_id, status, created_at desc);
create index if not exists hb_tasks_case_status_idx on public.hb_case_tasks(case_id, status);
create index if not exists hb_documents_owner_expiry_idx on public.hb_documents(owner_user_id, expires_at);
create index if not exists hb_obligations_user_due_idx on public.hb_obligations(user_id, status, due_at);
create index if not exists hb_audit_entity_idx on public.hb_audit_events(entity_type, entity_id, occurred_at desc);

alter table public.hb_jurisdictions enable row level security;
alter table public.hb_organizations enable row level security;
alter table public.hb_organization_members enable row level security;
alter table public.hb_cases enable row level security;
alter table public.hb_case_tasks enable row level security;
alter table public.hb_documents enable row level security;
alter table public.hb_consents enable row level security;
alter table public.hb_obligations enable row level security;
alter table public.hb_agent_runs enable row level security;
alter table public.hb_audit_events enable row level security;

create policy "jurisdictions readable" on public.hb_jurisdictions for select using (active = true);

create policy "organizations visible to members"
on public.hb_organizations for select
using (
  owner_user_id = auth.uid()
  or exists (
    select 1 from public.hb_organization_members m
    where m.organization_id = id and m.user_id = auth.uid()
  )
);

create policy "organizations insert by owner"
on public.hb_organizations for insert
with check (owner_user_id = auth.uid());

create policy "organizations update by owner/admin"
on public.hb_organizations for update
using (
  owner_user_id = auth.uid()
  or exists (
    select 1 from public.hb_organization_members m
    where m.organization_id = id and m.user_id = auth.uid() and m.role in ('owner','admin')
  )
);

create policy "members visible in authorized organizations"
on public.hb_organization_members for select
using (
  user_id = auth.uid()
  or exists (
    select 1 from public.hb_organizations o
    where o.id = organization_id and o.owner_user_id = auth.uid()
  )
);

create policy "cases visible to owner or org members"
on public.hb_cases for select
using (
  user_id = auth.uid()
  or (
    organization_id is not null and exists (
      select 1 from public.hb_organization_members m
      where m.organization_id = hb_cases.organization_id and m.user_id = auth.uid()
    )
  )
);

create policy "cases insert by user"
on public.hb_cases for insert with check (user_id = auth.uid());

create policy "cases update by user or org admins"
on public.hb_cases for update
using (
  user_id = auth.uid()
  or (
    organization_id is not null and exists (
      select 1 from public.hb_organization_members m
      where m.organization_id = hb_cases.organization_id and m.user_id = auth.uid() and m.role in ('owner','admin','operator')
    )
  )
);

create policy "tasks visible through case"
on public.hb_case_tasks for select
using (
  exists (
    select 1 from public.hb_cases c
    where c.id = case_id
      and (
        c.user_id = auth.uid()
        or (
          c.organization_id is not null and exists (
            select 1 from public.hb_organization_members m
            where m.organization_id = c.organization_id and m.user_id = auth.uid()
          )
        )
      )
  )
);

create policy "documents visible to owner or org members"
on public.hb_documents for select
using (
  owner_user_id = auth.uid()
  or (
    organization_id is not null and exists (
      select 1 from public.hb_organization_members m
      where m.organization_id = hb_documents.organization_id and m.user_id = auth.uid()
    )
  )
);

create policy "documents insert by owner"
on public.hb_documents for insert with check (owner_user_id = auth.uid());

create policy "consents owned by user"
on public.hb_consents for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "obligations owned by user or org members"
on public.hb_obligations for select
using (
  user_id = auth.uid()
  or (
    organization_id is not null and exists (
      select 1 from public.hb_organization_members m
      where m.organization_id = hb_obligations.organization_id and m.user_id = auth.uid()
    )
  )
);

create policy "agent runs visible to related user"
on public.hb_agent_runs for select
using (
  user_id = auth.uid()
  or exists (select 1 from public.hb_cases c where c.id = case_id and c.user_id = auth.uid())
);

create policy "audit events visible to related user"
on public.hb_audit_events for select
using (
  user_id = auth.uid()
  or (
    organization_id is not null and exists (
      select 1 from public.hb_organization_members m
      where m.organization_id = hb_audit_events.organization_id and m.user_id = auth.uid()
    )
  )
);

insert into public.hb_jurisdictions (code, name_ar, name_en, level, default_currency, default_locale, data_residency_region)
values ('AE', 'الإمارات العربية المتحدة', 'United Arab Emirates', 'country', 'AED', 'ar-AE', 'UAE')
on conflict (code) do nothing;
