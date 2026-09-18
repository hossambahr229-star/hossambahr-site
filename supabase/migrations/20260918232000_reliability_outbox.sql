-- Reliability primitives: idempotency and transactional outbox

create table if not exists public.hb_idempotency_keys (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  actor_ref text,
  operation text not null,
  request_hash text not null,
  response_snapshot jsonb,
  status text not null default 'started' check (status in ('started','completed','failed')),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.hb_outbox_events (
  id uuid primary key default gen_random_uuid(),
  aggregate_type text not null,
  aggregate_id text not null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  destination text,
  status text not null default 'pending' check (status in ('pending','processing','delivered','failed','dead_letter')),
  attempts integer not null default 0,
  available_at timestamptz not null default now(),
  locked_at timestamptz,
  delivered_at timestamptz,
  last_error text,
  created_at timestamptz not null default now()
);

create index if not exists hb_outbox_delivery_idx
on public.hb_outbox_events(status, available_at, created_at);

alter table public.hb_idempotency_keys enable row level security;
alter table public.hb_outbox_events enable row level security;

-- Intentionally no public client policies.
-- These tables are service-role only because they coordinate trusted server-side execution.
