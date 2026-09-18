-- CRM, omnichannel communications, marketplace, commissions, enterprise bulk operations and portable profiles.

create table if not exists public.hb_contacts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.hb_tenants(id) on delete cascade,
  linked_user_id uuid references auth.users(id) on delete set null,
  organization_id uuid references public.hb_organizations(id) on delete set null,
  display_name text not null,
  email text,
  phone text,
  preferred_locale text,
  consent_marketing boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.hb_leads (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.hb_tenants(id) on delete cascade,
  contact_id uuid references public.hb_contacts(id) on delete set null,
  source text,
  source_detail text,
  goal text,
  jurisdiction_code text,
  status text not null default 'new' check(status in ('new','qualified','quoted','won','lost','archived')),
  assigned_to_ref text,
  estimated_value numeric(14,2),
  currency text default 'AED',
  case_id uuid references public.hb_cases(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.hb_conversations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.hb_tenants(id) on delete cascade,
  contact_id uuid references public.hb_contacts(id) on delete set null,
  case_id uuid references public.hb_cases(id) on delete set null,
  channel text not null check(channel in ('web','whatsapp','email','sms','voice','api','internal')),
  external_thread_ref text,
  status text not null default 'open' check(status in ('open','waiting_customer','waiting_team','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.hb_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.hb_conversations(id) on delete cascade,
  direction text not null check(direction in ('inbound','outbound','internal')),
  actor_type text not null check(actor_type in ('user','staff','partner','agent','system','integration')),
  actor_ref text,
  content_ref text,
  content_preview text,
  external_message_ref text,
  delivery_status text check(delivery_status in ('queued','sent','delivered','read','failed')),
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create table if not exists public.hb_partner_offerings (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.hb_partners(id) on delete cascade,
  service_slug text,
  offering_key text not null,
  name text not null,
  jurisdiction_codes text[] not null default '{}',
  currency text,
  base_price numeric(14,2),
  sla_minutes integer,
  status text not null default 'draft' check(status in ('draft','active','paused','retired')),
  metadata jsonb not null default '{}'::jsonb,
  unique(partner_id,offering_key)
);

create table if not exists public.hb_marketplace_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  organization_id uuid references public.hb_organizations(id) on delete set null,
  case_id uuid references public.hb_cases(id) on delete set null,
  offering_id uuid not null references public.hb_partner_offerings(id) on delete restrict,
  partner_id uuid not null references public.hb_partners(id) on delete restrict,
  status text not null default 'requested' check(status in ('requested','accepted','in_progress','delivered','disputed','completed','cancelled')),
  currency text not null,
  amount numeric(14,2) not null check(amount>=0),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.hb_commission_rules (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.hb_tenants(id) on delete cascade,
  partner_id uuid references public.hb_partners(id) on delete cascade,
  rule_key text not null,
  calculation_type text not null check(calculation_type in ('fixed','percentage')),
  value numeric(14,4) not null check(value>=0),
  service_slug text,
  active boolean not null default true,
  unique(tenant_id,partner_id,rule_key)
);

create table if not exists public.hb_commissions (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.hb_partners(id) on delete cascade,
  marketplace_order_id uuid references public.hb_marketplace_orders(id) on delete set null,
  case_id uuid references public.hb_cases(id) on delete set null,
  currency text not null,
  amount numeric(14,2) not null check(amount>=0),
  status text not null default 'pending' check(status in ('pending','approved','payable','paid','reversed')),
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create table if not exists public.hb_bulk_batches (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.hb_tenants(id) on delete cascade,
  organization_id uuid not null references public.hb_organizations(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete restrict,
  batch_type text not null,
  status text not null default 'draft' check(status in ('draft','validating','ready','processing','completed','partially_failed','failed','cancelled')),
  total_items integer not null default 0,
  completed_items integer not null default 0,
  failed_items integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.hb_bulk_items (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.hb_bulk_batches(id) on delete cascade,
  external_row_ref text,
  case_id uuid references public.hb_cases(id) on delete set null,
  status text not null default 'pending' check(status in ('pending','valid','invalid','processing','completed','failed')),
  input_data jsonb not null default '{}'::jsonb,
  validation_errors jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.hb_portable_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  subject_node_id uuid references public.hb_graph_nodes(id) on delete cascade,
  profile_type text not null check(profile_type in ('business_passport','employment_passport')),
  version integer not null default 1,
  claims jsonb not null default '{}'::jsonb,
  credential_refs uuid[] not null default '{}',
  sharing_mode text not null default 'private' check(sharing_mode in ('private','link','delegated')),
  share_token_hash text,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists hb_leads_tenant_status_idx on public.hb_leads(tenant_id,status,created_at desc);
create index if not exists hb_conversations_case_idx on public.hb_conversations(case_id,status);
create index if not exists hb_marketplace_orders_partner_idx on public.hb_marketplace_orders(partner_id,status);
create index if not exists hb_batches_org_idx on public.hb_bulk_batches(organization_id,status);

alter table public.hb_contacts enable row level security;
alter table public.hb_leads enable row level security;
alter table public.hb_conversations enable row level security;
alter table public.hb_messages enable row level security;
alter table public.hb_partner_offerings enable row level security;
alter table public.hb_marketplace_orders enable row level security;
alter table public.hb_commission_rules enable row level security;
alter table public.hb_commissions enable row level security;
alter table public.hb_bulk_batches enable row level security;
alter table public.hb_bulk_items enable row level security;
alter table public.hb_portable_profiles enable row level security;

create policy "linked contacts visible to user or tenant members" on public.hb_contacts for select using(
  linked_user_id=auth.uid()
  or (organization_id is not null and public.hb_is_org_member(organization_id))
  or (tenant_id is not null and public.hb_is_tenant_member(tenant_id))
);
create policy "leads visible to tenant members" on public.hb_leads for select using(
  tenant_id is not null and public.hb_is_tenant_member(tenant_id)
);
create policy "conversations visible through case or tenant" on public.hb_conversations for select using(
  (tenant_id is not null and public.hb_is_tenant_member(tenant_id))
  or exists(select 1 from public.hb_cases c where c.id=case_id and c.user_id=auth.uid())
);
create policy "messages visible through conversation" on public.hb_messages for select using(
  exists(
    select 1 from public.hb_conversations c
    where c.id=conversation_id and (
      (c.tenant_id is not null and public.hb_is_tenant_member(c.tenant_id))
      or exists(select 1 from public.hb_cases cs where cs.id=c.case_id and cs.user_id=auth.uid())
    )
  )
);
create policy "active marketplace offerings readable" on public.hb_partner_offerings for select using(status='active');
create policy "marketplace orders visible to buyer or org members" on public.hb_marketplace_orders for select using(
  user_id=auth.uid()
  or (organization_id is not null and public.hb_is_org_member(organization_id))
);
create policy "bulk batches visible to org members" on public.hb_bulk_batches for select using(
  public.hb_is_org_member(organization_id)
);
create policy "bulk items visible through batch" on public.hb_bulk_items for select using(
  exists(select 1 from public.hb_bulk_batches b where b.id=batch_id and public.hb_is_org_member(b.organization_id))
);
create policy "portable profiles owned by user" on public.hb_portable_profiles for all using(owner_user_id=auth.uid()) with check(owner_user_id=auth.uid());

grant select on public.hb_contacts to authenticated;
grant select on public.hb_leads to authenticated;
grant select on public.hb_conversations to authenticated;
grant select on public.hb_messages to authenticated;
grant select on public.hb_partner_offerings to authenticated;
grant select on public.hb_marketplace_orders to authenticated;
grant select on public.hb_bulk_batches to authenticated;
grant select on public.hb_bulk_items to authenticated;
grant select,insert,update,delete on public.hb_portable_profiles to authenticated;

revoke insert,update,delete on public.hb_contacts from anon,authenticated;
revoke insert,update,delete on public.hb_leads from anon,authenticated;
revoke insert,update,delete on public.hb_conversations from anon,authenticated;
revoke insert,update,delete on public.hb_messages from anon,authenticated;
revoke insert,update,delete on public.hb_partner_offerings from anon,authenticated;
revoke insert,update,delete on public.hb_marketplace_orders from anon,authenticated;
revoke all on public.hb_commission_rules from anon,authenticated;
revoke all on public.hb_commissions from anon,authenticated;
revoke insert,update,delete on public.hb_bulk_batches from anon,authenticated;
revoke insert,update,delete on public.hb_bulk_items from anon,authenticated;
