-- Activate safe metadata-only document analysis.
-- The route never reads document bytes or sends private content to an external model.
-- Every result remains unverified and requires human review.

update public.hb_ai_routes
set
  preferred_models='[
    {"provider":"hossambahr","modelKey":"quality-engine-v1"},
    {"provider":"openai","modelKey":"gpt-5.6-sol"}
  ]'::jsonb,
  require_human_review=true,
  active=true,
  metadata=(
    coalesce(metadata,'{}'::jsonb)
    - 'blocked_reason'
  ) || jsonb_build_object(
    'purpose','Safe private-document metadata analysis',
    'analysis_scope','metadata_only',
    'content_access',false,
    'external_model_required',false,
    'human_review_required',true
  )
where route_key='document-analysis';

create or replace function hb_private.enqueue_document_analysis()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  v_agent_id uuid;
  v_tenant_id uuid;
begin
  if new.case_id is null then
    return new;
  end if;

  if not exists(
    select 1 from public.hb_ai_routes
    where route_key='document-analysis' and active=true
  ) then
    return new;
  end if;

  select id into v_agent_id
  from public.hb_agents
  where key='document' and active=true
  limit 1;

  if v_agent_id is null then
    return new;
  end if;

  select tenant_id into v_tenant_id
  from public.hb_cases
  where id=new.case_id;

  insert into public.hb_agent_jobs(
    tenant_id,agent_id,case_id,route_key,input_refs,status,priority,idempotency_key
  )
  values(
    v_tenant_id,
    v_agent_id,
    new.case_id,
    'document-analysis',
    jsonb_build_array(
      jsonb_build_object('type','case','id',new.case_id),
      jsonb_build_object('type','document','id',new.id)
    ),
    'queued',
    88,
    'document.registered:'||new.id::text||':analysis'
  )
  on conflict(idempotency_key) do nothing;

  return new;
end;
$$;

revoke all on function hb_private.enqueue_document_analysis() from public,anon,authenticated;

drop trigger if exists trg_hb_documents_enqueue_analysis on public.hb_documents;
create trigger trg_hb_documents_enqueue_analysis
after insert or update of case_id on public.hb_documents
for each row execute function hb_private.enqueue_document_analysis();
