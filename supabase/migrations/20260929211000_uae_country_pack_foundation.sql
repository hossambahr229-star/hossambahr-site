-- UAE-only Country Pack foundation for reproducible clean database rebuilds.
-- This restores schema objects that were originally provisioned directly in Production.
-- It preserves Country Pack strictly as an engineering abstraction; no non-UAE pack is seeded.

do $$
begin
  if not exists (
    select 1 from public.hb_jurisdictions where code='AE' and level='country'
  ) then
    insert into public.hb_jurisdictions(
      code,name_ar,name_en,level,parent_id,default_currency,default_locale,data_residency_region,active
    )
    values(
      'AE','الإمارات العربية المتحدة','United Arab Emirates','country',null,
      'AED','ar-AE','UAE',true
    )
    on conflict(code) do update set
      name_ar=excluded.name_ar,
      name_en=excluded.name_en,
      level='country',
      default_currency='AED',
      default_locale='ar-AE',
      data_residency_region='UAE',
      active=true,
      updated_at=now();
  end if;
end $$;

create table if not exists public.hb_country_packs (
  id uuid primary key default gen_random_uuid(),
  pack_key text not null,
  country_jurisdiction_id uuid not null references public.hb_jurisdictions(id) on delete restrict,
  version integer not null default 1 check (version > 0),
  status text not null default 'draft' check (status in ('draft','review','active','paused','retired')),
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

alter table public.hb_country_packs enable row level security;

insert into public.hb_country_packs(
  pack_key,country_jurisdiction_id,version,status,default_locale,default_currency,
  data_residency_region,supported_languages,capabilities,metadata,activated_at
)
select
  'country:AE',
  j.id,
  1,
  'active',
  'ar-AE',
  'AED',
  'UAE',
  array['ar','en']::text[],
  jsonb_build_object(
    'policy_engine',true,
    'service_catalog',true,
    'workflow_engine',true,
    'assisted_execution',true,
    'source_verification',true,
    'direct_execution_links',true
  ),
  jsonb_build_object(
    'country_code','AE',
    'source_of_truth','official government sources',
    'scope','UAE-only'
  ),
  now()
from public.hb_jurisdictions j
where j.code='AE' and j.level='country'
on conflict(pack_key,version) do nothing;

alter table public.hb_service_bindings
  add column if not exists country_pack_id uuid,
  add column if not exists authority_id uuid;

alter table public.hb_policy_sources
  add column if not exists country_pack_id uuid,
  add column if not exists authority_id uuid;

alter table public.hb_policy_versions
  add column if not exists country_pack_id uuid;

alter table public.hb_workflow_templates
  add column if not exists country_pack_id uuid;

do $$
declare
  v_ae_pack uuid;
begin
  select id into v_ae_pack
  from public.hb_country_packs
  where pack_key='country:AE' and version=1
  limit 1;

  if v_ae_pack is null then
    raise exception 'UAE Country Pack foundation could not be created';
  end if;

  update public.hb_service_bindings
  set country_pack_id=v_ae_pack
  where country_pack_id is null;

  update public.hb_policy_sources
  set country_pack_id=v_ae_pack
  where country_pack_id is null;

  update public.hb_policy_versions
  set country_pack_id=v_ae_pack
  where country_pack_id is null;

  update public.hb_workflow_templates
  set country_pack_id=v_ae_pack
  where country_pack_id is null;
end $$;

create table if not exists public.hb_authorities (
  id uuid primary key default gen_random_uuid(),
  country_pack_id uuid not null references public.hb_country_packs(id) on delete cascade,
  jurisdiction_id uuid references public.hb_jurisdictions(id) on delete restrict,
  authority_key text not null,
  name_ar text,
  name_en text not null,
  scope text not null default 'other'
    check (scope in ('federal','local','free_zone','municipal','judicial','other')),
  official_base_url text,
  portal_url text,
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(country_pack_id,authority_key)
);

alter table public.hb_authorities enable row level security;

do $$
declare
  v_ae_pack uuid;
  v_ae_jurisdiction uuid;
begin
  select cp.id,cp.country_jurisdiction_id
    into v_ae_pack,v_ae_jurisdiction
  from public.hb_country_packs cp
  where cp.pack_key='country:AE' and cp.version=1
  limit 1;

  insert into public.hb_authorities(
    country_pack_id,jurisdiction_id,authority_key,name_ar,name_en,scope,active,metadata
  )
  select distinct
    v_ae_pack,
    coalesce(x.jurisdiction_id,v_ae_jurisdiction),
    x.authority_key,
    x.authority_key,
    upper(x.authority_key),
    case
      when x.authority_key in ('mohre','icp','fta','mofa','moe') then 'federal'
      else 'local'
    end,
    true,
    jsonb_build_object('foundation','derived-from-existing-uae-catalog')
  from (
    select distinct on (authority_key) authority_key,jurisdiction_id
    from (
      select authority_key,jurisdiction_id
      from public.hb_service_bindings
      where nullif(btrim(coalesce(authority_key,'')),'') is not null
      union all
      select authority_key,jurisdiction_id
      from public.hb_policy_sources
      where nullif(btrim(coalesce(authority_key,'')),'') is not null
    ) raw_authorities
    order by authority_key,jurisdiction_id nulls last
  ) x
  on conflict(country_pack_id,authority_key) do nothing;

  update public.hb_service_bindings b
  set authority_id=a.id
  from public.hb_authorities a
  where b.authority_id is null
    and a.country_pack_id=b.country_pack_id
    and a.authority_key=b.authority_key;

  update public.hb_policy_sources s
  set authority_id=a.id
  from public.hb_authorities a
  where s.authority_id is null
    and a.country_pack_id=s.country_pack_id
    and a.authority_key=s.authority_key;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname='hb_service_bindings_country_pack_id_fkey'
      and conrelid='public.hb_service_bindings'::regclass
  ) then
    alter table public.hb_service_bindings
      add constraint hb_service_bindings_country_pack_id_fkey
      foreign key(country_pack_id) references public.hb_country_packs(id) on delete restrict;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname='hb_service_bindings_authority_id_fkey'
      and conrelid='public.hb_service_bindings'::regclass
  ) then
    alter table public.hb_service_bindings
      add constraint hb_service_bindings_authority_id_fkey
      foreign key(authority_id) references public.hb_authorities(id) on delete restrict;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname='hb_policy_sources_country_pack_id_fkey'
      and conrelid='public.hb_policy_sources'::regclass
  ) then
    alter table public.hb_policy_sources
      add constraint hb_policy_sources_country_pack_id_fkey
      foreign key(country_pack_id) references public.hb_country_packs(id) on delete restrict;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname='hb_policy_sources_authority_id_fkey'
      and conrelid='public.hb_policy_sources'::regclass
  ) then
    alter table public.hb_policy_sources
      add constraint hb_policy_sources_authority_id_fkey
      foreign key(authority_id) references public.hb_authorities(id) on delete restrict;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname='hb_policy_versions_country_pack_id_fkey'
      and conrelid='public.hb_policy_versions'::regclass
  ) then
    alter table public.hb_policy_versions
      add constraint hb_policy_versions_country_pack_id_fkey
      foreign key(country_pack_id) references public.hb_country_packs(id) on delete restrict;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname='hb_workflow_templates_country_pack_id_fkey'
      and conrelid='public.hb_workflow_templates'::regclass
  ) then
    alter table public.hb_workflow_templates
      add constraint hb_workflow_templates_country_pack_id_fkey
      foreign key(country_pack_id) references public.hb_country_packs(id) on delete restrict;
  end if;
end $$;

alter table public.hb_service_bindings
  alter column country_pack_id set not null,
  alter column authority_id set not null;

alter table public.hb_policy_sources
  alter column country_pack_id set not null,
  alter column authority_id set not null;

alter table public.hb_policy_versions
  alter column country_pack_id set not null;

alter table public.hb_workflow_templates
  alter column country_pack_id set not null;

create index if not exists hb_authorities_country_pack_active_idx
  on public.hb_authorities(country_pack_id,active);

create index if not exists hb_policy_sources_country_pack_active_idx
  on public.hb_policy_sources(country_pack_id,active);

create index if not exists hb_policy_versions_country_pack_status_idx
  on public.hb_policy_versions(country_pack_id,status);

create index if not exists hb_workflow_templates_country_pack_status_idx
  on public.hb_workflow_templates(country_pack_id,status);

drop policy if exists "active country packs readable" on public.hb_country_packs;
create policy "active country packs readable"
on public.hb_country_packs for select
using (status='active');

drop policy if exists "active authorities readable" on public.hb_authorities;
create policy "active authorities readable"
on public.hb_authorities for select
using (active=true);

grant select on public.hb_country_packs to anon,authenticated;
grant select on public.hb_authorities to anon,authenticated;
