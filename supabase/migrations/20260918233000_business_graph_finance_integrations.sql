-- Global OS advanced operational domains:
-- business graph, digital twins, approvals, partners, integrations, finance.

create table if not exists public.hb_graph_nodes (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references auth.users(id) on delete set null,
  organization_id uuid references public.hb_organizations(id) on delete cascade,
  node_type text not null check (node_type in ('person','organization','license','registration','employee','residency','credential','asset','authority','case','document')),
  external_ref text,
  label text not null,
  jurisdiction_id uuid references public.hb_jurisdictions(id) on delete set null,
  attributes jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.hb_graph_edges (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references auth.users(id) on delete set null,
  organization_id uuid references public.hb_organizations(id) on delete cascade,
  from_node_id uuid not null references public.hb_graph_nodes(id) on delete cascade,
  to_node_id uuid not null references public.hb_graph_nodes(id) on delete cascade,
  relation_type text not null,
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  evidence_document_id uuid references public.hb_documents(id) on delete set null,
  attributes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (from_node_id <> to_node_id)
);

create table if not exists public.hb_entity_snapshots (
  id uuid primary key default gen_random_uuid(),
  node_id uuid not null references public.hb_graph_nodes(id) on delete cascade,
  snapshot_type text not null,
  version integer not null,
  state jsonb not null,
  source text not null default 'platform',
  captured_at timestamptz not null default now(),
  unique (node_id, snapshot_type, version)
);

create table if not exists public.hb_credentials (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references auth.users(id) on delete set null,
  organization_id uuid references public.hb_organizations(id) on delete cascade,
  subject_node_id uuid references public.hb_graph_nodes(id) on delete cascade,
  credential_type text not null,
  issuer_name text,
  issuer_ref text,
  claims jsonb not null default '{}'::jsonb,
  verification_status text not null default 'unverified' check (verification_status in ('unverified','source_backed','cryptographically_verified','human_reviewed','revoked')),
  issued_at timestamptz,
  expires_at timestamptz,
  evidence_document_id uuid references public.hb_documents(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.hb_delegations (
  id uuid primary key default gen_random_uuid(),
  grantor_user_id uuid references auth.users(id) on delete cascade,
  organization_id uuid references public.hb_organizations(id) on delete cascade,
  grantee_type text not null check (grantee_type in ('user','staff','partner','agent','integration')),
  grantee_ref text not null,
  scopes text[] not null,
  purpose text not null,
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  status text not null default 'active' check (status in ('active','revoked','expired')),
  created_at timestamptz not null default now()
);

create table if not exists public.hb_approvals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid references public.hb_organizations(id) on delete cascade,
  case_id uuid references public.hb_cases(id) on delete cascade,
  task_id uuid references public.hb_case_tasks(id) on delete cascade,
  action_key text not null,
  action_payload_hash text not null,
  reason text,
  status text not null default 'pending' check (status in ('pending','approved','rejected','expired','cancelled')),
  requested_by_type text not null check (requested_by_type in ('staff','partner','agent','system','integration')),
  requested_by_ref text,
  decided_by uuid references auth.users(id) on delete set null,
  requested_at timestamptz not null default now(),
  decided_at timestamptz,
  expires_at timestamptz
);

create table if not exists public.hb_partners (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null,
  trade_name text,
  partner_type text not null check (partner_type in ('pro','typing_office','legal','accounting','translation','insurance','banking','property','technology','other')),
  jurisdiction_codes text[] not null default '{}',
  status text not null default 'pending' check (status in ('pending','approved','suspended','rejected')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.hb_partner_members (
  partner_id uuid not null references public.hb_partners(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'operator' check (role in ('owner','admin','operator','viewer')),
  created_at timestamptz not null default now(),
  primary key (partner_id, user_id)
);

create table if not exists public.hb_integrations (
  id uuid primary key default gen_random_uuid(),
  integration_key text not null unique,
  name text not null,
  category text not null,
  auth_type text not null default 'api_key',
  capabilities text[] not null default '{}',
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.hb_integration_connections (
  id uuid primary key default gen_random_uuid(),
  integration_id uuid not null references public.hb_integrations(id) on delete restrict,
  user_id uuid references auth.users(id) on delete cascade,
  organization_id uuid references public.hb_organizations(id) on delete cascade,
  secret_ref text not null,
  scopes text[] not null default '{}',
  status text not null default 'active' check (status in ('active','expired','revoked','error')),
  last_verified_at timestamptz,
  created_at timestamptz not null default now(),
  check (user_id is not null or organization_id is not null)
);

create table if not exists public.hb_quotes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  organization_id uuid references public.hb_organizations(id) on delete set null,
  case_id uuid references public.hb_cases(id) on delete set null,
  currency text not null default 'AED',
  status text not null default 'draft' check (status in ('draft','sent','accepted','expired','cancelled','paid')),
  subtotal numeric(14,2) not null default 0,
  government_fees numeric(14,2) not null default 0,
  service_fees numeric(14,2) not null default 0,
  tax_amount numeric(14,2) not null default 0,
  total numeric(14,2) generated always as (subtotal + government_fees + service_fees + tax_amount) stored,
  valid_until timestamptz,
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);

create table if not exists public.hb_quote_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.hb_quotes(id) on delete cascade,
  item_type text not null check (item_type in ('government_fee','service_fee','tax','discount','third_party','other')),
  description text not null,
  quantity numeric(12,2) not null default 1,
  unit_amount numeric(14,2) not null default 0,
  amount numeric(14,2) generated always as (quantity * unit_amount) stored,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.hb_payment_intents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  organization_id uuid references public.hb_organizations(id) on delete set null,
  quote_id uuid references public.hb_quotes(id) on delete set null,
  case_id uuid references public.hb_cases(id) on delete set null,
  provider text,
  provider_ref text,
  idempotency_key text not null unique,
  currency text not null,
  amount numeric(14,2) not null check (amount >= 0),
  status text not null default 'created' check (status in ('created','requires_action','processing','succeeded','failed','cancelled','refunded')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.hb_ledger_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.hb_organizations(id) on delete set null,
  case_id uuid references public.hb_cases(id) on delete set null,
  payment_intent_id uuid references public.hb_payment_intents(id) on delete set null,
  entry_type text not null check (entry_type in ('charge','refund','government_fee','service_fee','commission','tax','adjustment')),
  currency text not null,
  amount numeric(14,2) not null,
  reference text,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create index if not exists hb_graph_nodes_owner_idx on public.hb_graph_nodes(owner_user_id, node_type);
create index if not exists hb_graph_nodes_org_idx on public.hb_graph_nodes(organization_id, node_type);
create index if not exists hb_graph_edges_from_idx on public.hb_graph_edges(from_node_id, relation_type);
create index if not exists hb_graph_edges_to_idx on public.hb_graph_edges(to_node_id, relation_type);
create index if not exists hb_credentials_expiry_idx on public.hb_credentials(owner_user_id, expires_at);
create index if not exists hb_approvals_pending_idx on public.hb_approvals(user_id, status, requested_at desc);
create index if not exists hb_payment_case_idx on public.hb_payment_intents(case_id, status);

alter table public.hb_graph_nodes enable row level security;
alter table public.hb_graph_edges enable row level security;
alter table public.hb_entity_snapshots enable row level security;
alter table public.hb_credentials enable row level security;
alter table public.hb_delegations enable row level security;
alter table public.hb_approvals enable row level security;
alter table public.hb_partners enable row level security;
alter table public.hb_partner_members enable row level security;
alter table public.hb_integrations enable row level security;
alter table public.hb_integration_connections enable row level security;
alter table public.hb_quotes enable row level security;
alter table public.hb_quote_items enable row level security;
alter table public.hb_payment_intents enable row level security;
alter table public.hb_ledger_entries enable row level security;

create policy "graph nodes visible to owner or org members" on public.hb_graph_nodes for select using (
  owner_user_id = auth.uid()
  or (organization_id is not null and exists (
    select 1 from public.hb_organization_members m
    where m.organization_id = hb_graph_nodes.organization_id and m.user_id = auth.uid()
  ))
);

create policy "graph edges visible to owner or org members" on public.hb_graph_edges for select using (
  owner_user_id = auth.uid()
  or (organization_id is not null and exists (
    select 1 from public.hb_organization_members m
    where m.organization_id = hb_graph_edges.organization_id and m.user_id = auth.uid()
  ))
);

create policy "snapshots visible through node" on public.hb_entity_snapshots for select using (
  exists (
    select 1 from public.hb_graph_nodes n
    where n.id = node_id and (
      n.owner_user_id = auth.uid()
      or (n.organization_id is not null and exists (
        select 1 from public.hb_organization_members m
        where m.organization_id = n.organization_id and m.user_id = auth.uid()
      ))
    )
  )
);

create policy "credentials visible to owner or org members" on public.hb_credentials for select using (
  owner_user_id = auth.uid()
  or (organization_id is not null and exists (
    select 1 from public.hb_organization_members m
    where m.organization_id = hb_credentials.organization_id and m.user_id = auth.uid()
  ))
);

create policy "delegations controlled by grantor" on public.hb_delegations for all
using (grantor_user_id = auth.uid())
with check (grantor_user_id = auth.uid());

create policy "approvals controlled by user" on public.hb_approvals for select using (user_id = auth.uid());
create policy "approvals decided by user" on public.hb_approvals for update using (user_id = auth.uid());

create policy "approved partners readable" on public.hb_partners for select using (status = 'approved');
create policy "partner members see membership" on public.hb_partner_members for select using (user_id = auth.uid());

create policy "integration catalog readable" on public.hb_integrations for select using (active = true);

create policy "integration connections visible to owner or org members" on public.hb_integration_connections for select using (
  user_id = auth.uid()
  or (organization_id is not null and exists (
    select 1 from public.hb_organization_members m
    where m.organization_id = hb_integration_connections.organization_id and m.user_id = auth.uid()
  ))
);

create policy "quotes visible to owner or org members" on public.hb_quotes for select using (
  user_id = auth.uid()
  or (organization_id is not null and exists (
    select 1 from public.hb_organization_members m
    where m.organization_id = hb_quotes.organization_id and m.user_id = auth.uid()
  ))
);

create policy "quote items visible through quote" on public.hb_quote_items for select using (
  exists (
    select 1 from public.hb_quotes q
    where q.id = quote_id and (
      q.user_id = auth.uid()
      or (q.organization_id is not null and exists (
        select 1 from public.hb_organization_members m
        where m.organization_id = q.organization_id and m.user_id = auth.uid()
      ))
    )
  )
);

create policy "payments visible to owner or org members" on public.hb_payment_intents for select using (
  user_id = auth.uid()
  or (organization_id is not null and exists (
    select 1 from public.hb_organization_members m
    where m.organization_id = hb_payment_intents.organization_id and m.user_id = auth.uid()
  ))
);

create policy "ledger visible to org members" on public.hb_ledger_entries for select using (
  organization_id is not null and exists (
    select 1 from public.hb_organization_members m
    where m.organization_id = hb_ledger_entries.organization_id and m.user_id = auth.uid()
  )
);

-- Sensitive writes for graph construction, snapshots, credentials, integrations,
-- payments, ledger, and partner lifecycle are intentionally reserved for
-- trusted server-side execution via service role / controlled functions.
