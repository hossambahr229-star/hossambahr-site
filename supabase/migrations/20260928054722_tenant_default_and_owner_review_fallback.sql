-- Default HOSSAM BAHR tenant assignment and safe human fallback for internal review tasks.

create or replace function hb_private.default_tenant_id()
returns uuid
language sql
stable
security definer
set search_path=''
as $$
  select id from public.hb_tenants
  where tenant_key='hossambahr' and status='active'
  limit 1
$$;

revoke all on function hb_private.default_tenant_id() from public,anon,authenticated;

create or replace function public.hb_assign_default_tenant()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
begin
  if new.tenant_id is null then
    new.tenant_id := hb_private.default_tenant_id();
  end if;
  return new;
end;
$$;

revoke all on function public.hb_assign_default_tenant() from public,anon,authenticated;

drop trigger if exists hb_case_default_tenant on public.hb_cases;
create trigger hb_case_default_tenant
before insert on public.hb_cases
for each row execute function public.hb_assign_default_tenant();

drop trigger if exists hb_organization_default_tenant on public.hb_organizations;
create trigger hb_organization_default_tenant
before insert on public.hb_organizations
for each row execute function public.hb_assign_default_tenant();

create or replace function hb_private.can_review_case(p_case_id uuid)
returns boolean
language sql
stable
security definer
set search_path=''
as $$
  select coalesce(exists(
    select 1
    from public.hb_cases c
    join public.hb_tenant_members tm
      on tm.tenant_id=c.tenant_id
    where c.id=p_case_id
      and tm.user_id=(select auth.uid())
      and tm.role in ('owner','admin','operator')
  ),false)
$$;

revoke all on function hb_private.can_review_case(uuid) from public,anon,authenticated;

create or replace function hb_private.owner_review_queue(p_limit integer default 50)
returns table(
  task_id uuid,
  case_id uuid,
  case_title text,
  service_slug text,
  task_title text,
  task_type text,
  task_status text,
  assignee_type text,
  submitted_at timestamptz,
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
    t.task_type,
    t.status,
    t.assignee_type,
    case
      when nullif(t.metadata->>'user_submitted_at','') is not null
        then (t.metadata->>'user_submitted_at')::timestamptz
      else null
    end,
    t.created_at
  from public.hb_case_tasks t
  join public.hb_cases c on c.id=t.case_id
  join public.hb_tenant_members tm
    on tm.tenant_id=c.tenant_id
   and tm.user_id=(select auth.uid())
   and tm.role in ('owner','admin','operator')
  where t.status in ('waiting','in_progress','todo')
    and t.assignee_type in ('agent','staff')
    and t.requires_approval=false
    and t.task_type not in ('approval','external','payment','signature')
    and not exists(
      select 1
      from unnest(t.dependency_ids) dep
      where not exists(
        select 1 from public.hb_case_tasks d
        where d.id=dep and d.status='done'
      )
    )
  order by
    case when t.metadata ? 'user_submitted_at' then 0 else 1 end,
    t.created_at asc
  limit least(greatest(coalesce(p_limit,50),1),100);
end;
$$;

revoke all on function hb_private.owner_review_queue(integer) from public,anon;
grant execute on function hb_private.owner_review_queue(integer) to authenticated;

create or replace function public.hb_owner_review_queue(p_limit integer default 50)
returns table(
  task_id uuid,
  case_id uuid,
  case_title text,
  service_slug text,
  task_title text,
  task_type text,
  task_status text,
  assignee_type text,
  submitted_at timestamptz,
  created_at timestamptz
)
language sql
stable
security invoker
set search_path=''
as $$
  select * from hb_private.owner_review_queue(p_limit)
$$;

revoke all on function public.hb_owner_review_queue(integer) from public,anon;
grant execute on function public.hb_owner_review_queue(integer) to authenticated;

create or replace function hb_private.complete_internal_review(
  p_task_id uuid,
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
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode='42501';
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
    raise exception 'Review access denied' using errcode='42501';
  end if;

  if v_task.requires_approval
     or v_task.task_type in ('approval','external','payment','signature')
     or v_task.assignee_type not in ('agent','staff')
     or v_task.status not in ('waiting','in_progress','todo')
  then
    raise exception 'Task cannot be completed by internal review' using errcode='22023';
  end if;

  if exists(
    select 1
    from unnest(v_task.dependency_ids) dep
    where not exists(
      select 1 from public.hb_case_tasks d
      where d.id=dep and d.status='done'
    )
  ) then
    raise exception 'Task dependencies are incomplete' using errcode='22023';
  end if;

  update public.hb_case_tasks
  set
    status='done',
    metadata=metadata || jsonb_build_object(
      'human_reviewed_at',now(),
      'human_reviewed_by',v_user_id,
      'human_review_note',nullif(left(btrim(coalesce(p_note,'')),1000),'')
    ),
    updated_at=now()
  where id=p_task_id;

  insert into public.hb_case_events(
    case_id,event_type,actor_type,actor_ref,payload
  )
  values(
    v_case.id,
    'task.human_review_completed',
    'staff',
    v_user_id::text,
    jsonb_build_object('task_id',p_task_id,'task_type',v_task.task_type)
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

revoke all on function hb_private.complete_internal_review(uuid,text) from public,anon;
grant execute on function hb_private.complete_internal_review(uuid,text) to authenticated;

create or replace function public.hb_complete_internal_review(
  p_task_id uuid,
  p_note text default null
)
returns jsonb
language sql
volatile
security invoker
set search_path=''
as $$
  select hb_private.complete_internal_review(p_task_id,p_note)
$$;

revoke all on function public.hb_complete_internal_review(uuid,text) from public,anon;
grant execute on function public.hb_complete_internal_review(uuid,text) to authenticated;
