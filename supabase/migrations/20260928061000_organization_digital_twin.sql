-- Organization Digital Twin, internal operational health, graph root sync,
-- and document-expiry obligations.

create unique index if not exists hb_graph_org_root_unique
on public.hb_graph_nodes(organization_id,node_type)
where organization_id is not null and node_type='organization';

create or replace function public.hb_sync_organization_graph_root()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
begin
  insert into public.hb_graph_nodes(
    owner_user_id,organization_id,node_type,external_ref,label,jurisdiction_id,attributes,active
  )
  values(
    new.owner_user_id,
    new.id,
    'organization',
    new.id::text,
    coalesce(nullif(new.trade_name,''),new.legal_name),
    new.jurisdiction_id,
    jsonb_build_object(
      'legal_name',new.legal_name,
      'trade_name',new.trade_name,
      'registration_number',new.registration_number,
      'lifecycle_status',new.lifecycle_status
    ),
    new.lifecycle_status not in ('closed','liquidated','cancelled')
  )
  on conflict(organization_id,node_type) where organization_id is not null and node_type='organization'
  do update set
    owner_user_id=excluded.owner_user_id,
    external_ref=excluded.external_ref,
    label=excluded.label,
    jurisdiction_id=excluded.jurisdiction_id,
    attributes=excluded.attributes,
    active=excluded.active,
    updated_at=now();
  return new;
end;
$$;

revoke all on function public.hb_sync_organization_graph_root() from public,anon,authenticated;

drop trigger if exists hb_organization_graph_root on public.hb_organizations;
create trigger hb_organization_graph_root
after insert or update of legal_name,trade_name,jurisdiction_id,registration_number,lifecycle_status
on public.hb_organizations
for each row execute function public.hb_sync_organization_graph_root();

insert into public.hb_graph_nodes(
  owner_user_id,organization_id,node_type,external_ref,label,jurisdiction_id,attributes,active
)
select
  o.owner_user_id,o.id,'organization',o.id::text,
  coalesce(nullif(o.trade_name,''),o.legal_name),
  o.jurisdiction_id,
  jsonb_build_object(
    'legal_name',o.legal_name,
    'trade_name',o.trade_name,
    'registration_number',o.registration_number,
    'lifecycle_status',o.lifecycle_status
  ),
  o.lifecycle_status not in ('closed','liquidated','cancelled')
from public.hb_organizations o
on conflict(organization_id,node_type) where organization_id is not null and node_type='organization'
do update set
  owner_user_id=excluded.owner_user_id,
  external_ref=excluded.external_ref,
  label=excluded.label,
  jurisdiction_id=excluded.jurisdiction_id,
  attributes=excluded.attributes,
  active=excluded.active,
  updated_at=now();

create unique index if not exists hb_obligations_source_document_unique
on public.hb_obligations(source_document_id,obligation_type)
where source_document_id is not null;

create or replace function public.hb_sync_document_expiry_obligation()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  v_title text;
begin
  if new.expires_at is null then
    update public.hb_obligations
    set status='cancelled',
        metadata=metadata || jsonb_build_object('cancelled_reason','document_expiry_removed')
    where source_document_id=new.id
      and obligation_type='document_expiry'
      and status in ('open','snoozed');
    return new;
  end if;

  v_title := 'انتهاء مستند: ' || coalesce(nullif(new.original_filename,''),new.document_type);

  insert into public.hb_obligations(
    user_id,organization_id,source_document_id,obligation_type,title,due_at,status,related_case_id,metadata
  )
  values(
    new.owner_user_id,new.organization_id,new.id,'document_expiry',v_title,
    (new.expires_at::timestamp at time zone 'UTC'),'open',new.case_id,
    jsonb_build_object(
      'document_type',new.document_type,
      'verification_status',new.verification_status,
      'source','document_expiry'
    )
  )
  on conflict(source_document_id,obligation_type)
  where source_document_id is not null
  do update set
    user_id=excluded.user_id,
    organization_id=excluded.organization_id,
    title=excluded.title,
    due_at=excluded.due_at,
    status=case when public.hb_obligations.status='completed' then public.hb_obligations.status else 'open' end,
    related_case_id=excluded.related_case_id,
    metadata=public.hb_obligations.metadata || excluded.metadata;
  return new;
end;
$$;

revoke all on function public.hb_sync_document_expiry_obligation() from public,anon,authenticated;

drop trigger if exists hb_document_expiry_obligation on public.hb_documents;
create trigger hb_document_expiry_obligation
after insert or update of expires_at,organization_id,case_id,document_type,original_filename,verification_status
on public.hb_documents
for each row execute function public.hb_sync_document_expiry_obligation();

create or replace function hb_private.organization_digital_twin(p_organization_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path=''
as $$
declare
  v_org public.hb_organizations%rowtype;
  v_docs integer;
  v_expired_docs integer;
  v_expiring_docs integer;
  v_open_obligations integer;
  v_overdue integer;
  v_due_30 integer;
  v_open_cases integer;
  v_blocked_cases integer;
  v_waiting_customer integer;
  v_credentials integer;
  v_expiring_credentials integer;
  v_graph_nodes integer;
  v_licenses integer;
  v_employees integer;
  v_residencies integer;
  v_score integer;
  v_level text;
  v_attention integer;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required' using errcode='42501';
  end if;

  if not hb_private.is_org_member(p_organization_id) then
    raise exception 'Organization access denied' using errcode='42501';
  end if;

  select * into v_org
  from public.hb_organizations
  where id=p_organization_id;

  if not found then
    raise exception 'Organization not found' using errcode='P0002';
  end if;

  select
    count(*),
    count(*) filter(where expires_at is not null and expires_at < current_date),
    count(*) filter(where expires_at between current_date and current_date+60)
  into v_docs,v_expired_docs,v_expiring_docs
  from public.hb_documents
  where organization_id=p_organization_id;

  select
    count(*) filter(where status in ('open','snoozed')),
    count(*) filter(where status in ('open','snoozed') and due_at<now()),
    count(*) filter(where status in ('open','snoozed') and due_at between now() and now()+interval '30 days')
  into v_open_obligations,v_overdue,v_due_30
  from public.hb_obligations
  where organization_id=p_organization_id;

  select
    count(*) filter(where status not in ('completed','cancelled')),
    count(*) filter(where status='blocked'),
    count(*) filter(where status='waiting_customer')
  into v_open_cases,v_blocked_cases,v_waiting_customer
  from public.hb_cases
  where organization_id=p_organization_id;

  select
    count(*) filter(where verification_status<>'revoked' and (expires_at is null or expires_at>now())),
    count(*) filter(where verification_status<>'revoked' and expires_at between now() and now()+interval '60 days')
  into v_credentials,v_expiring_credentials
  from public.hb_credentials
  where organization_id=p_organization_id;

  select
    count(*) filter(where active),
    count(*) filter(where active and node_type='license'),
    count(*) filter(where active and node_type='employee'),
    count(*) filter(where active and node_type='residency')
  into v_graph_nodes,v_licenses,v_employees,v_residencies
  from public.hb_graph_nodes
  where organization_id=p_organization_id;

  v_score := greatest(0,100
    - least(40,v_overdue*20)
    - least(24,v_expired_docs*12)
    - least(16,v_blocked_cases*8)
    - least(15,v_due_30*5)
    - least(12,v_expiring_docs*4)
    - least(9,v_waiting_customer*3)
    - least(8,v_expiring_credentials*4)
  );

  v_level := case
    when v_score>=85 then 'stable'
    when v_score>=60 then 'attention'
    else 'critical'
  end;

  v_attention := v_overdue+v_expired_docs+v_blocked_cases+v_due_30+v_expiring_docs+v_waiting_customer+v_expiring_credentials;

  return jsonb_build_object(
    'organization',jsonb_build_object(
      'id',v_org.id,
      'legal_name',v_org.legal_name,
      'trade_name',v_org.trade_name,
      'registration_number',v_org.registration_number,
      'lifecycle_status',v_org.lifecycle_status,
      'jurisdiction_id',v_org.jurisdiction_id,
      'updated_at',v_org.updated_at
    ),
    'health',jsonb_build_object(
      'score',v_score,
      'level',v_level,
      'attention_count',v_attention,
      'kind','internal_operational_health',
      'note','مؤشر تشغيلي داخلي وليس تصنيفًا حكوميًا أو ائتمانيًا.'
    ),
    'counts',jsonb_build_object(
      'documents',v_docs,
      'expired_documents',v_expired_docs,
      'expiring_documents_60d',v_expiring_docs,
      'open_obligations',v_open_obligations,
      'overdue_obligations',v_overdue,
      'due_obligations_30d',v_due_30,
      'open_cases',v_open_cases,
      'blocked_cases',v_blocked_cases,
      'waiting_customer_cases',v_waiting_customer,
      'active_credentials',v_credentials,
      'expiring_credentials_60d',v_expiring_credentials,
      'graph_nodes',v_graph_nodes,
      'licenses',v_licenses,
      'employees',v_employees,
      'residencies',v_residencies
    ),
    'upcoming_obligations',coalesce((
      select jsonb_agg(x order by (x->>'due_at')::timestamptz)
      from (
        select jsonb_build_object(
          'id',o.id,'title',o.title,'type',o.obligation_type,
          'due_at',o.due_at,'status',o.status,'related_case_id',o.related_case_id
        ) x
        from public.hb_obligations o
        where o.organization_id=p_organization_id
          and o.status in ('open','snoozed')
        order by o.due_at
        limit 10
      ) q
    ),'[]'::jsonb),
    'documents',coalesce((
      select jsonb_agg(x order by coalesce((x->>'expires_at')::date,'9999-12-31'::date))
      from (
        select jsonb_build_object(
          'id',d.id,'type',d.document_type,'name',d.original_filename,
          'expires_at',d.expires_at,'verification_status',d.verification_status
        ) x
        from public.hb_documents d
        where d.organization_id=p_organization_id
        order by d.expires_at nulls last,d.created_at desc
        limit 20
      ) q
    ),'[]'::jsonb),
    'cases',coalesce((
      select jsonb_agg(x order by (x->>'updated_at')::timestamptz desc)
      from (
        select jsonb_build_object(
          'id',c.id,'title',c.title,'service_slug',c.service_slug,
          'status',c.status,'readiness_percent',c.readiness_percent,'updated_at',c.updated_at
        ) x
        from public.hb_cases c
        where c.organization_id=p_organization_id
        order by c.updated_at desc
        limit 20
      ) q
    ),'[]'::jsonb)
  );
end;
$$;

revoke all on function hb_private.organization_digital_twin(uuid) from public,anon;
grant execute on function hb_private.organization_digital_twin(uuid) to authenticated;

create or replace function public.hb_organization_digital_twin(p_organization_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path=''
as $$
  select hb_private.organization_digital_twin(p_organization_id)
$$;

revoke all on function public.hb_organization_digital_twin(uuid) from public,anon;
grant execute on function public.hb_organization_digital_twin(uuid) to authenticated;


create or replace function public.hb_my_organization_twins(p_limit integer default 20)
returns table(
  organization_id uuid,
  twin jsonb
)
language sql
stable
security invoker
set search_path=''
as $$
  select
    o.id,
    hb_private.organization_digital_twin(o.id)
  from public.hb_organizations o
  join public.hb_organization_members m
    on m.organization_id=o.id
   and m.user_id=(select auth.uid())
  order by o.updated_at desc
  limit least(greatest(coalesce(p_limit,20),1),50)
$$;

revoke all on function public.hb_my_organization_twins(integer) from public,anon;
grant execute on function public.hb_my_organization_twins(integer) to authenticated;
