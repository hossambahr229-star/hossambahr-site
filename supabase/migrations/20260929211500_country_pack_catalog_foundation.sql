-- Complete the Country Pack catalog foundation before case-routing migrations.
-- Idempotent on Production; reconstructs the same UAE catalog relationships on a clean database.

alter table public.hb_service_bindings add column if not exists country_pack_id uuid;
alter table public.hb_service_bindings add column if not exists authority_id uuid;
alter table public.hb_policy_sources add column if not exists country_pack_id uuid;
alter table public.hb_policy_sources add column if not exists authority_id uuid;
alter table public.hb_policy_versions add column if not exists country_pack_id uuid;
alter table public.hb_workflow_templates add column if not exists country_pack_id uuid;

insert into public.hb_country_packs(
  pack_key,country_jurisdiction_id,version,status,default_locale,default_currency,
  data_residency_region,supported_languages,capabilities,metadata,activated_at
)
select 'uae',j.id,1,'active','ar-AE','AED','UAE',array['ar','en']::text[],
       '{"government_services":true}'::jsonb,
       '{"bootstrap":"clean_catalog_foundation"}'::jsonb,now()
from public.hb_jurisdictions j
where j.code='AE'
on conflict(pack_key,version) do nothing;

create table if not exists public.hb_authorities(
  id uuid primary key default gen_random_uuid(),
  country_pack_id uuid not null references public.hb_country_packs(id) on delete cascade,
  jurisdiction_id uuid references public.hb_jurisdictions(id) on delete restrict,
  authority_key text not null,
  name_ar text,
  name_en text not null,
  scope text not null default 'other' check(scope in ('federal','local','free_zone','municipal','judicial','other')),
  official_base_url text,
  portal_url text,
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(country_pack_id,authority_key)
);
alter table public.hb_authorities enable row level security;

insert into public.hb_authorities(country_pack_id,jurisdiction_id,authority_key,name_en,active,metadata)
select cp.id,
       min(coalesce(b.jurisdiction_id,s.jurisdiction_id)) as jurisdiction_id,
       keys.authority_key,
       keys.authority_key,
       true,
       '{"bootstrap":"derived_from_verified_catalog"}'::jsonb
from (
  select authority_key from public.hb_service_bindings where authority_key is not null
  union
  select authority_key from public.hb_policy_sources where authority_key is not null
) keys
cross join lateral (select id from public.hb_country_packs where pack_key='uae' and status='active' order by version desc limit 1) cp
left join public.hb_service_bindings b on b.authority_key=keys.authority_key
left join public.hb_policy_sources s on s.authority_key=keys.authority_key
group by cp.id,keys.authority_key
on conflict(country_pack_id,authority_key) do nothing;

update public.hb_service_bindings b
set country_pack_id=cp.id, authority_id=a.id
from public.hb_country_packs cp
join public.hb_authorities a on a.country_pack_id=cp.id
where cp.pack_key='uae' and cp.status='active' and a.authority_key=b.authority_key
  and (b.country_pack_id is null or b.authority_id is null);

update public.hb_policy_sources s
set country_pack_id=cp.id, authority_id=a.id
from public.hb_country_packs cp
join public.hb_authorities a on a.country_pack_id=cp.id
where cp.pack_key='uae' and cp.status='active' and a.authority_key=s.authority_key
  and (s.country_pack_id is null or s.authority_id is null);

update public.hb_policy_versions p
set country_pack_id=cp.id
from public.hb_country_packs cp
where cp.pack_key='uae' and cp.status='active' and p.country_pack_id is null;

update public.hb_workflow_templates w
set country_pack_id=cp.id
from public.hb_country_packs cp
where cp.pack_key='uae' and cp.status='active' and w.country_pack_id is null;

alter table public.hb_service_bindings alter column country_pack_id set not null;
alter table public.hb_service_bindings alter column authority_id set not null;
alter table public.hb_policy_sources alter column country_pack_id set not null;
alter table public.hb_policy_sources alter column authority_id set not null;
alter table public.hb_policy_versions alter column country_pack_id set not null;
alter table public.hb_workflow_templates alter column country_pack_id set not null;

do $$ begin
  alter table public.hb_service_bindings add constraint hb_service_bindings_country_pack_id_fkey foreign key(country_pack_id) references public.hb_country_packs(id) on delete cascade;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.hb_service_bindings add constraint hb_service_bindings_authority_id_fkey foreign key(authority_id) references public.hb_authorities(id) on delete restrict;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.hb_policy_sources add constraint hb_policy_sources_country_pack_id_fkey foreign key(country_pack_id) references public.hb_country_packs(id) on delete cascade;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.hb_policy_sources add constraint hb_policy_sources_authority_id_fkey foreign key(authority_id) references public.hb_authorities(id) on delete restrict;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.hb_policy_versions add constraint hb_policy_versions_country_pack_id_fkey foreign key(country_pack_id) references public.hb_country_packs(id) on delete cascade;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.hb_workflow_templates add constraint hb_workflow_templates_country_pack_id_fkey foreign key(country_pack_id) references public.hb_country_packs(id) on delete cascade;
exception when duplicate_object then null; end $$;
