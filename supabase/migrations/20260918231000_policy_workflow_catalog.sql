-- Global OS policy/workflow catalog and UAE jurisdiction pack

create table if not exists public.hb_policy_sources (
  id uuid primary key default gen_random_uuid(),
  jurisdiction_id uuid references public.hb_jurisdictions(id) on delete cascade,
  authority_key text not null,
  title text not null,
  source_url text not null,
  source_type text not null default 'official',
  last_verified_at timestamptz,
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  unique (authority_key, source_url)
);

create table if not exists public.hb_policy_versions (
  id uuid primary key default gen_random_uuid(),
  policy_key text not null,
  jurisdiction_id uuid references public.hb_jurisdictions(id) on delete cascade,
  version integer not null,
  effective_from timestamptz not null,
  effective_until timestamptz,
  status text not null default 'draft' check (status in ('draft','review','active','retired')),
  rules jsonb not null default '[]'::jsonb,
  source_ids uuid[] not null default '{}',
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (policy_key, jurisdiction_id, version)
);

create table if not exists public.hb_workflow_templates (
  id uuid primary key default gen_random_uuid(),
  workflow_key text not null,
  jurisdiction_id uuid references public.hb_jurisdictions(id) on delete cascade,
  service_slug text,
  version integer not null,
  status text not null default 'draft' check (status in ('draft','review','active','retired')),
  definition jsonb not null,
  effective_from timestamptz not null default now(),
  effective_until timestamptz,
  created_at timestamptz not null default now(),
  unique (workflow_key, jurisdiction_id, version)
);

create table if not exists public.hb_service_bindings (
  id uuid primary key default gen_random_uuid(),
  service_slug text not null,
  jurisdiction_id uuid references public.hb_jurisdictions(id) on delete cascade,
  authority_key text,
  policy_key text,
  workflow_key text,
  execution_mode text not null default 'guidance' check (execution_mode in ('guidance','assisted','integrated')),
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  unique (service_slug, jurisdiction_id)
);

alter table public.hb_policy_sources enable row level security;
alter table public.hb_policy_versions enable row level security;
alter table public.hb_workflow_templates enable row level security;
alter table public.hb_service_bindings enable row level security;

create policy "policy sources readable when active"
on public.hb_policy_sources for select
using (active = true);

create policy "active policy versions readable"
on public.hb_policy_versions for select
using (
  status = 'active'
  and effective_from <= now()
  and (effective_until is null or effective_until > now())
);

create policy "active workflows readable"
on public.hb_workflow_templates for select
using (
  status = 'active'
  and effective_from <= now()
  and (effective_until is null or effective_until > now())
);

create policy "service bindings readable"
on public.hb_service_bindings for select
using (active = true);

with ae as (
  select id from public.hb_jurisdictions where code = 'AE'
)
insert into public.hb_jurisdictions (code, name_ar, name_en, level, parent_id, default_currency, default_locale, data_residency_region)
select x.code, x.name_ar, x.name_en, 'emirate', ae.id, 'AED', 'ar-AE', 'UAE'
from ae
cross join (values
  ('AE-AZ','أبوظبي','Abu Dhabi'),
  ('AE-DU','دبي','Dubai'),
  ('AE-SH','الشارقة','Sharjah'),
  ('AE-AJ','عجمان','Ajman'),
  ('AE-RK','رأس الخيمة','Ras Al Khaimah'),
  ('AE-UQ','أم القيوين','Umm Al Quwain'),
  ('AE-FU','الفجيرة','Fujairah')
) as x(code,name_ar,name_en)
on conflict (code) do nothing;
