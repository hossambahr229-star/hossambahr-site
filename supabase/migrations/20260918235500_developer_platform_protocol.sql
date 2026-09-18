-- Developer platform, API access, webhooks, and protocol metering.

create table if not exists public.hb_api_clients (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.hb_tenants(id) on delete cascade,
  name text not null,
  client_key text not null unique,
  scopes text[] not null default '{}',
  status text not null default 'active' check (status in ('active','suspended','revoked')),
  rate_limit_per_minute integer not null default 60 check (rate_limit_per_minute > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.hb_api_keys (
  id uuid primary key default gen_random_uuid(),
  api_client_id uuid not null references public.hb_api_clients(id) on delete cascade,
  key_prefix text not null,
  secret_hash text not null,
  status text not null default 'active' check (status in ('active','rotating','revoked','expired')),
  last_used_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  unique(api_client_id,key_prefix)
);

create table if not exists public.hb_webhook_endpoints (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.hb_tenants(id) on delete cascade,
  api_client_id uuid references public.hb_api_clients(id) on delete cascade,
  endpoint_url text not null,
  event_types text[] not null default '{}',
  signing_secret_ref text not null,
  status text not null default 'active' check (status in ('active','paused','disabled')),
  created_at timestamptz not null default now()
);

create table if not exists public.hb_webhook_deliveries (
  id uuid primary key default gen_random_uuid(),
  webhook_endpoint_id uuid not null references public.hb_webhook_endpoints(id) on delete cascade,
  outbox_event_id uuid references public.hb_outbox_events(id) on delete set null,
  event_type text not null,
  payload_hash text not null,
  status text not null default 'pending' check (status in ('pending','delivered','failed','dead_letter')),
  attempts integer not null default 0,
  response_status integer,
  response_hash text,
  next_attempt_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.hb_api_usage (
  id bigserial primary key,
  tenant_id uuid not null references public.hb_tenants(id) on delete cascade,
  api_client_id uuid references public.hb_api_clients(id) on delete set null,
  operation text not null,
  status_code integer not null,
  request_units integer not null default 1 check(request_units >= 0),
  latency_ms integer,
  occurred_at timestamptz not null default now()
);

create table if not exists public.hb_protocol_transactions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.hb_tenants(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  organization_id uuid references public.hb_organizations(id) on delete set null,
  case_id uuid references public.hb_cases(id) on delete set null,
  protocol_version text not null default '1.0',
  intent text not null,
  state text not null default 'requested' check (state in ('requested','verified','priced','awaiting_approval','approved','executing','evidenced','settled','failed','cancelled')),
  request_payload jsonb not null default '{}'::jsonb,
  evidence_refs jsonb not null default '[]'::jsonb,
  settlement_ref text,
  idempotency_key text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists hb_webhook_delivery_queue_idx on public.hb_webhook_deliveries(status,next_attempt_at,created_at);
create index if not exists hb_api_usage_tenant_time_idx on public.hb_api_usage(tenant_id,occurred_at desc);
create index if not exists hb_protocol_case_idx on public.hb_protocol_transactions(case_id,state);

alter table public.hb_api_clients enable row level security;
alter table public.hb_api_keys enable row level security;
alter table public.hb_webhook_endpoints enable row level security;
alter table public.hb_webhook_deliveries enable row level security;
alter table public.hb_api_usage enable row level security;
alter table public.hb_protocol_transactions enable row level security;

create policy "api clients visible to tenant admins" on public.hb_api_clients for select using(
  public.hb_has_tenant_role(tenant_id,array['owner','admin'])
);
create policy "webhook endpoints visible to tenant admins" on public.hb_webhook_endpoints for select using(
  public.hb_has_tenant_role(tenant_id,array['owner','admin'])
);
create policy "api usage visible to tenant admins" on public.hb_api_usage for select using(
  public.hb_has_tenant_role(tenant_id,array['owner','admin','finance'])
);
create policy "protocol transactions visible to user or org members" on public.hb_protocol_transactions for select using(
  user_id=auth.uid()
  or (organization_id is not null and public.hb_is_org_member(organization_id))
  or (tenant_id is not null and public.hb_is_tenant_member(tenant_id))
);

revoke all on public.hb_api_keys from anon,authenticated;
revoke insert,update,delete on public.hb_api_clients from anon,authenticated;
revoke insert,update,delete on public.hb_webhook_endpoints from anon,authenticated;
revoke all on public.hb_webhook_deliveries from anon,authenticated;
revoke insert,update,delete on public.hb_api_usage from anon,authenticated;
revoke insert,update,delete on public.hb_protocol_transactions from anon,authenticated;

grant select on public.hb_api_clients to authenticated;
grant select on public.hb_webhook_endpoints to authenticated;
grant select on public.hb_api_usage to authenticated;
grant select on public.hb_protocol_transactions to authenticated;
