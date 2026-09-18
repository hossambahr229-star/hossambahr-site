-- Multi-tenant, white-label, sovereign deployment, and AI gateway catalog.

create table if not exists public.hb_tenants (
  id uuid primary key default gen_random_uuid(),
  tenant_key text not null unique,
  name text not null,
  tenant_type text not null default 'internal' check (tenant_type in ('internal','partner','enterprise','white_label','government')),
  deployment_mode text not null default 'shared' check (deployment_mode in ('shared','dedicated','sovereign')),
  data_residency_region text,
  default_locale text not null default 'ar-AE',
  default_currency text not null default 'AED',
  status text not null default 'active' check (status in ('active','suspended','closed')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.hb_tenant_members (
  tenant_id uuid not null references public.hb_tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','admin','operator','finance','compliance','viewer')),
  created_at timestamptz not null default now(),
  primary key (tenant_id,user_id)
);

create table if not exists public.hb_tenant_domains (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.hb_tenants(id) on delete cascade,
  hostname text not null unique,
  status text not null default 'pending' check (status in ('pending','verified','disabled')),
  verification_ref text,
  created_at timestamptz not null default now()
);

create table if not exists public.hb_brand_profiles (
  tenant_id uuid primary key references public.hb_tenants(id) on delete cascade,
  brand_name text not null,
  brand_name_ar text,
  logo_url text,
  primary_token text,
  secondary_token text,
  support_phone text,
  support_email text,
  metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.hb_feature_flags (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.hb_tenants(id) on delete cascade,
  flag_key text not null,
  enabled boolean not null default false,
  rollout_percent integer not null default 100 check (rollout_percent between 0 and 100),
  rules jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique (tenant_id,flag_key)
);

create table if not exists public.hb_ai_models (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  model_key text not null,
  capability_tags text[] not null default '{}',
  allowed_data_classes text[] not null default '{}',
  regions text[] not null default '{}',
  status text not null default 'active' check (status in ('active','restricted','disabled')),
  metadata jsonb not null default '{}'::jsonb,
  unique(provider,model_key)
);

create table if not exists public.hb_ai_routes (
  id uuid primary key default gen_random_uuid(),
  route_key text not null unique,
  task_type text not null,
  preferred_models jsonb not null default '[]'::jsonb,
  required_capabilities text[] not null default '{}',
  max_data_class text not null default 'internal' check (max_data_class in ('public','internal','confidential','restricted')),
  require_region text,
  require_human_review boolean not null default false,
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.hb_agent_jobs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.hb_tenants(id) on delete cascade,
  agent_id uuid not null references public.hb_agents(id) on delete restrict,
  case_id uuid references public.hb_cases(id) on delete cascade,
  route_key text,
  input_refs jsonb not null default '[]'::jsonb,
  status text not null default 'queued' check (status in ('queued','running','needs_approval','completed','failed','cancelled')),
  priority integer not null default 100,
  idempotency_key text not null unique,
  available_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  result_ref text,
  last_error text,
  created_at timestamptz not null default now()
);

create table if not exists public.hb_agent_tool_grants (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.hb_agents(id) on delete cascade,
  tenant_id uuid references public.hb_tenants(id) on delete cascade,
  tool_key text not null,
  scopes text[] not null default '{}',
  environment text not null default 'production' check (environment in ('development','staging','production')),
  requires_approval boolean not null default true,
  active boolean not null default true,
  unique(agent_id,tenant_id,tool_key,environment)
);

alter table public.hb_organizations add column if not exists tenant_id uuid references public.hb_tenants(id) on delete set null;
alter table public.hb_cases add column if not exists tenant_id uuid references public.hb_tenants(id) on delete set null;
alter table public.hb_audit_events add column if not exists tenant_id uuid references public.hb_tenants(id) on delete set null;

create index if not exists hb_tenant_members_user_idx on public.hb_tenant_members(user_id,tenant_id);
create index if not exists hb_agent_jobs_queue_idx on public.hb_agent_jobs(status,priority,available_at);

alter table public.hb_tenants enable row level security;
alter table public.hb_tenant_members enable row level security;
alter table public.hb_tenant_domains enable row level security;
alter table public.hb_brand_profiles enable row level security;
alter table public.hb_feature_flags enable row level security;
alter table public.hb_ai_models enable row level security;
alter table public.hb_ai_routes enable row level security;
alter table public.hb_agent_jobs enable row level security;
alter table public.hb_agent_tool_grants enable row level security;

create or replace function public.hb_is_tenant_member(target_tenant uuid)
returns boolean
language sql
stable
security definer
set search_path=''
as $$
  select exists(
    select 1 from public.hb_tenant_members m
    where m.tenant_id=target_tenant
      and m.user_id=(select auth.uid())
  );
$$;

create or replace function public.hb_has_tenant_role(target_tenant uuid, allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path=''
as $$
  select exists(
    select 1 from public.hb_tenant_members m
    where m.tenant_id=target_tenant
      and m.user_id=(select auth.uid())
      and m.role=any(allowed_roles)
  );
$$;

revoke all on function public.hb_is_tenant_member(uuid) from public,anon;
revoke all on function public.hb_has_tenant_role(uuid,text[]) from public,anon;
grant execute on function public.hb_is_tenant_member(uuid) to authenticated;
grant execute on function public.hb_has_tenant_role(uuid,text[]) to authenticated;

create policy "tenants visible to members" on public.hb_tenants for select using(public.hb_is_tenant_member(id));
create policy "tenant members visible to self or admins" on public.hb_tenant_members for select using(
  user_id=auth.uid() or public.hb_has_tenant_role(tenant_id,array['owner','admin'])
);
create policy "tenant domains visible to members" on public.hb_tenant_domains for select using(public.hb_is_tenant_member(tenant_id));
create policy "brand profile visible to tenant members" on public.hb_brand_profiles for select using(public.hb_is_tenant_member(tenant_id));
create policy "feature flags visible to tenant members" on public.hb_feature_flags for select using(tenant_id is null or public.hb_is_tenant_member(tenant_id));

-- AI routing catalog is backend-managed; users may not mutate model or route policy.
revoke all on public.hb_ai_models from anon,authenticated;
revoke all on public.hb_ai_routes from anon,authenticated;
revoke all on public.hb_agent_jobs from anon,authenticated;
revoke all on public.hb_agent_tool_grants from anon,authenticated;

grant select on public.hb_tenants to authenticated;
grant select on public.hb_tenant_members to authenticated;
grant select on public.hb_tenant_domains to authenticated;
grant select on public.hb_brand_profiles to authenticated;
grant select on public.hb_feature_flags to authenticated;

insert into public.hb_tenants(tenant_key,name,tenant_type,deployment_mode,data_residency_region,default_locale,default_currency)
values('hossambahr','HOSSAM BAHR','internal','shared','UAE','ar-AE','AED')
on conflict(tenant_key) do nothing;
