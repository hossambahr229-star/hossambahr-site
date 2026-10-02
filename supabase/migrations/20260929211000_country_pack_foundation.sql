-- Foundation must sort before 20260929212000_country_pack_case_routing.sql.
-- Production already has this table; IF NOT EXISTS makes this a no-op there and repairs clean rebuilds.
create table if not exists public.hb_country_packs(
  id uuid primary key default gen_random_uuid(),
  pack_key text not null,
  country_jurisdiction_id uuid not null references public.hb_jurisdictions(id) on delete restrict,
  version integer not null default 1 check(version>0),
  status text not null default 'draft' check(status in ('draft','review','active','paused','retired')),
  default_locale text,
  default_currency text,
  data_residency_region text,
  supported_languages text[] not null default '{}',
  capabilities jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  activated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(pack_key,version)
);
