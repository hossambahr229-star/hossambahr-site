-- Private document vault and document-intelligence metadata.

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values(
  'hb-private-documents',
  'hb-private-documents',
  false,
  10485760,
  array['application/pdf','image/jpeg','image/png','image/webp']
)
on conflict(id) do update set
  public=false,
  file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "hb vault select own" on storage.objects;
create policy "hb vault select own"
on storage.objects for select to authenticated
using (
  bucket_id='hb-private-documents'
  and (storage.foldername(name))[1]=(select auth.uid())::text
);

drop policy if exists "hb vault upload own" on storage.objects;
create policy "hb vault upload own"
on storage.objects for insert to authenticated
with check (
  bucket_id='hb-private-documents'
  and (storage.foldername(name))[1]=(select auth.uid())::text
);

drop policy if exists "hb vault update own" on storage.objects;
create policy "hb vault update own"
on storage.objects for update to authenticated
using (
  bucket_id='hb-private-documents'
  and (storage.foldername(name))[1]=(select auth.uid())::text
)
with check (
  bucket_id='hb-private-documents'
  and (storage.foldername(name))[1]=(select auth.uid())::text
);

drop policy if exists "hb vault delete own" on storage.objects;
create policy "hb vault delete own"
on storage.objects for delete to authenticated
using (
  bucket_id='hb-private-documents'
  and (storage.foldername(name))[1]=(select auth.uid())::text
);

create table if not exists public.hb_document_versions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.hb_documents(id) on delete cascade,
  version integer not null,
  storage_path text not null,
  checksum text,
  size_bytes bigint,
  mime_type text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(document_id,version)
);

create table if not exists public.hb_document_analysis (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.hb_documents(id) on delete cascade,
  version_id uuid references public.hb_document_versions(id) on delete cascade,
  analysis_type text not null check(analysis_type in ('classification','extraction','expiry','mismatch','quality','redaction','verification')),
  engine_ref text,
  status text not null default 'queued' check(status in ('queued','running','completed','failed','needs_review')),
  confidence numeric(5,4) check(confidence is null or (confidence>=0 and confidence<=1)),
  findings jsonb not null default '{}'::jsonb,
  source_refs jsonb not null default '[]'::jsonb,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.hb_retention_policies (
  id uuid primary key default gen_random_uuid(),
  jurisdiction_code text,
  document_type text,
  retention_days integer not null check(retention_days>=0),
  legal_basis text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.hb_data_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  scope text not null check(scope in ('document','case','organization','account')),
  entity_id text,
  reason text,
  status text not null default 'requested' check(status in ('requested','reviewing','approved','executing','completed','rejected')),
  requested_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.hb_document_versions enable row level security;
alter table public.hb_document_analysis enable row level security;
alter table public.hb_retention_policies enable row level security;
alter table public.hb_data_deletion_requests enable row level security;

create policy "document versions visible through document"
on public.hb_document_versions for select
using(
  exists(
    select 1 from public.hb_documents d
    where d.id=document_id
      and (
        d.owner_user_id=auth.uid()
        or (d.organization_id is not null and public.hb_is_org_member(d.organization_id))
      )
  )
);

create policy "document versions inserted by owner"
on public.hb_document_versions for insert
with check(
  created_by=auth.uid()
  and exists(select 1 from public.hb_documents d where d.id=document_id and d.owner_user_id=auth.uid())
);

create policy "document analysis visible through document"
on public.hb_document_analysis for select
using(
  exists(
    select 1 from public.hb_documents d
    where d.id=document_id
      and (
        d.owner_user_id=auth.uid()
        or (d.organization_id is not null and public.hb_is_org_member(d.organization_id))
      )
  )
);

create policy "active retention policies readable"
on public.hb_retention_policies for select
using(active=true);

create policy "deletion requests owned by user"
on public.hb_data_deletion_requests for select
using(user_id=auth.uid());

create policy "deletion requests created by user"
on public.hb_data_deletion_requests for insert
with check(user_id=auth.uid());

grant select,insert on public.hb_document_versions to authenticated;
grant select on public.hb_document_analysis to authenticated;
grant select on public.hb_retention_policies to authenticated;
grant select,insert on public.hb_data_deletion_requests to authenticated;

revoke insert,update,delete on public.hb_document_analysis from anon,authenticated;
revoke insert,update,delete on public.hb_retention_policies from anon,authenticated;
revoke update,delete on public.hb_data_deletion_requests from anon,authenticated;
