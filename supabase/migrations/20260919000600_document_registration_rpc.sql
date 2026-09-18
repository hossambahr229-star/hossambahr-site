-- Atomic document metadata registration after private storage upload.

create or replace function public.hb_register_document(
  p_document_type text,
  p_storage_path text,
  p_original_filename text,
  p_size_bytes bigint,
  p_mime_type text,
  p_case_id uuid default null,
  p_organization_id uuid default null,
  p_expires_at date default null
)
returns uuid
language plpgsql
security invoker
set search_path=''
as $$
declare
  new_document_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'authentication required';
  end if;
  if p_storage_path not like ((select auth.uid())::text || '/%') then
    raise exception 'storage path is outside user vault';
  end if;
  if p_organization_id is not null and not public.hb_is_org_member(p_organization_id) then
    raise exception 'organization access denied';
  end if;
  if p_case_id is not null and not exists(
    select 1 from public.hb_cases c
    where c.id=p_case_id
      and (
        c.user_id=(select auth.uid())
        or (c.organization_id is not null and public.hb_is_org_member(c.organization_id))
      )
  ) then
    raise exception 'case access denied';
  end if;

  insert into public.hb_documents(
    owner_user_id,organization_id,case_id,document_type,storage_path,
    original_filename,expires_at,verification_status
  )
  values(
    (select auth.uid()),p_organization_id,p_case_id,p_document_type,p_storage_path,
    p_original_filename,p_expires_at,'unverified'
  )
  returning id into new_document_id;

  insert into public.hb_document_versions(
    document_id,version,storage_path,size_bytes,mime_type,created_by
  )
  values(
    new_document_id,1,p_storage_path,p_size_bytes,p_mime_type,(select auth.uid())
  );

  return new_document_id;
end;
$$;

revoke all on function public.hb_register_document(text,text,text,bigint,text,uuid,uuid,date) from public,anon;
grant execute on function public.hb_register_document(text,text,text,bigint,text,uuid,uuid,date) to authenticated;
