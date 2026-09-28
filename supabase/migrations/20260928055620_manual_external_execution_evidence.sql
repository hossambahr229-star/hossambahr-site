-- Manual external-execution evidence path plus deterministic safe completion.

create or replace function hb_private.refresh_case_progress(p_case_id uuid)
returns void
language plpgsql
security definer
set search_path=''
as $$
declare
  v_total integer;
  v_done integer;
  v_percent integer;
  v_current_status text;
  v_next_status text;
begin
  update public.hb_case_tasks t
  set
    status='done',
    metadata=t.metadata || jsonb_build_object('system_completed_at',now()),
    updated_at=now()
  where t.case_id=p_case_id
    and t.status='todo'
    and t.assignee_type='system'
    and t.requires_approval=false
    and t.task_type='completion'
    and not exists(
      select 1
      from unnest(t.dependency_ids) dep
      where not exists(
        select 1 from public.hb_case_tasks d
        where d.id=dep and d.status='done'
      )
    );

  select count(*),count(*) filter(where status='done')
    into v_total,v_done
  from public.hb_case_tasks
  where case_id=p_case_id and status<>'cancelled';

  select status into v_current_status
  from public.hb_cases
  where id=p_case_id;

  if not found then return; end if;

  v_percent:=case when v_total=0 then 0 else round((v_done::numeric/v_total::numeric)*100)::integer end;

  if v_current_status in ('cancelled','blocked') then
    v_next_status:=v_current_status;
  elsif v_total>0 and v_done=v_total then
    v_next_status:='completed';
  elsif exists(
    select 1 from public.hb_case_tasks t
    where t.case_id=p_case_id
      and t.status in ('todo','in_progress','waiting','needs_approval')
      and (
        t.assignee_type='user'
        or (
          t.requires_approval
          and not exists(
            select 1 from public.hb_approvals a
            where a.task_id=t.id and a.status='approved'
          )
        )
      )
      and not exists(
        select 1 from unnest(t.dependency_ids) dep
        where not exists(
          select 1 from public.hb_case_tasks d
          where d.id=dep and d.status='done'
        )
      )
  ) then
    v_next_status:='waiting_customer';
  elsif exists(
    select 1 from public.hb_case_tasks
    where case_id=p_case_id
      and status='waiting'
      and assignee_type='integration'
  ) then
    v_next_status:='waiting_external';
  elsif exists(
    select 1 from public.hb_case_tasks
    where case_id=p_case_id
      and status in ('in_progress','waiting')
      and assignee_type in ('agent','staff','partner')
  ) then
    v_next_status:='in_progress';
  else
    v_next_status:='qualifying';
  end if;

  update public.hb_cases
  set readiness_percent=v_percent,status=v_next_status,updated_at=now()
  where id=p_case_id
    and (readiness_percent is distinct from v_percent or status is distinct from v_next_status);
end;
$$;

revoke all on function hb_private.refresh_case_progress(uuid) from public,anon,authenticated;

create or replace function hb_private.owner_execution_queue(p_limit integer default 50)
returns table(
  task_id uuid,
  case_id uuid,
  case_title text,
  service_slug text,
  task_title text,
  task_status text,
  approved_at timestamptz,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path=''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required' using errcode='42501';
  end if;

  return query
  select
    t.id,
    c.id,
    c.title,
    c.service_slug,
    t.title,
    t.status,
    max(a.decided_at) filter(where a.status='approved'),
    t.created_at
  from public.hb_case_tasks t
  join public.hb_cases c on c.id=t.case_id
  join public.hb_tenant_members tm
    on tm.tenant_id=c.tenant_id
   and tm.user_id=(select auth.uid())
   and tm.role in ('owner','admin','operator')
  join public.hb_approvals a
    on a.task_id=t.id
   and a.status='approved'
  where t.status='waiting'
    and t.requires_approval=true
    and (t.assignee_type='integration' or t.task_type='external')
    and not exists(
      select 1
      from unnest(t.dependency_ids) dep
      where not exists(
        select 1 from public.hb_case_tasks d
        where d.id=dep and d.status='done'
      )
    )
  group by t.id,c.id,c.title,c.service_slug,t.title,t.status,t.created_at
  order by t.created_at asc
  limit least(greatest(coalesce(p_limit,50),1),100);
end;
$$;

revoke all on function hb_private.owner_execution_queue(integer) from public,anon;
grant execute on function hb_private.owner_execution_queue(integer) to authenticated;

create or replace function public.hb_owner_execution_queue(p_limit integer default 50)
returns table(
  task_id uuid,
  case_id uuid,
  case_title text,
  service_slug text,
  task_title text,
  task_status text,
  approved_at timestamptz,
  created_at timestamptz
)
language sql
stable
security invoker
set search_path=''
as $$
  select * from hb_private.owner_execution_queue(p_limit)
$$;

revoke all on function public.hb_owner_execution_queue(integer) from public,anon;
grant execute on function public.hb_owner_execution_queue(integer) to authenticated;

create or replace function hb_private.record_external_execution(
  p_task_id uuid,
  p_reference text,
  p_note text default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path=''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_task public.hb_case_tasks%rowtype;
  v_case public.hb_cases%rowtype;
  v_reference text := left(btrim(coalesce(p_reference,'')),200);
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode='42501';
  end if;

  if char_length(v_reference)<2 then
    raise exception 'Execution reference is required' using errcode='22023';
  end if;

  select * into v_task
  from public.hb_case_tasks
  where id=p_task_id
  for update;

  if not found then
    raise exception 'Task not found' using errcode='P0002';
  end if;

  select * into v_case
  from public.hb_cases
  where id=v_task.case_id;

  if not hb_private.can_review_case(v_case.id) then
    raise exception 'Execution access denied' using errcode='42501';
  end if;

  if v_task.status<>'waiting'
     or not v_task.requires_approval
     or not (v_task.assignee_type='integration' or v_task.task_type='external')
  then
    raise exception 'Task is not awaiting external execution evidence' using errcode='22023';
  end if;

  if not exists(
    select 1 from public.hb_approvals a
    where a.task_id=p_task_id and a.status='approved'
  ) then
    raise exception 'Explicit user approval is required' using errcode='42501';
  end if;

  update public.hb_case_tasks
  set
    status='done',
    metadata=metadata || jsonb_build_object(
      'external_execution_recorded_at',now(),
      'external_execution_recorded_by',v_user_id,
      'external_execution_reference',v_reference,
      'external_execution_note',nullif(left(btrim(coalesce(p_note,'')),1000),'')
    ),
    updated_at=now()
  where id=p_task_id;

  insert into public.hb_case_events(
    case_id,event_type,actor_type,actor_ref,payload
  )
  values(
    v_case.id,
    'external_execution.recorded',
    'staff',
    v_user_id::text,
    jsonb_build_object('task_id',p_task_id,'reference',v_reference)
  );

  perform hb_private.refresh_case_progress(v_case.id);

  return jsonb_build_object(
    'task_id',p_task_id,
    'case_id',v_case.id,
    'status','done',
    'case_status',(select status from public.hb_cases where id=v_case.id),
    'readiness_percent',(select readiness_percent from public.hb_cases where id=v_case.id)
  );
end;
$$;

revoke all on function hb_private.record_external_execution(uuid,text,text) from public,anon;
grant execute on function hb_private.record_external_execution(uuid,text,text) to authenticated;

create or replace function public.hb_record_external_execution(
  p_task_id uuid,
  p_reference text,
  p_note text default null
)
returns jsonb
language sql
volatile
security invoker
set search_path=''
as $$
  select hb_private.record_external_execution(p_task_id,p_reference,p_note)
$$;

revoke all on function public.hb_record_external_execution(uuid,text,text) from public,anon;
grant execute on function public.hb_record_external_execution(uuid,text,text) to authenticated;
