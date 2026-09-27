-- Allow users to submit their assigned requirements for review and explicitly decide sensitive approvals.
-- Privileged state changes remain inside hb_private; public wrappers are SECURITY INVOKER.

create or replace function hb_private.refresh_case_progress(p_case_id uuid)
returns void language plpgsql security definer set search_path=''
as $$
declare v_total integer; v_done integer; v_percent integer; v_current_status text; v_next_status text;
begin
  select count(*),count(*) filter(where status='done') into v_total,v_done
  from public.hb_case_tasks where case_id=p_case_id and status<>'cancelled';
  select status into v_current_status from public.hb_cases where id=p_case_id;
  if not found then return; end if;
  v_percent:=case when v_total=0 then 0 else round((v_done::numeric/v_total::numeric)*100)::integer end;
  if v_current_status in ('cancelled','blocked') then v_next_status:=v_current_status;
  elsif v_total>0 and v_done=v_total then v_next_status:='completed';
  elsif exists(
    select 1 from public.hb_case_tasks t
    where t.case_id=p_case_id and t.status in ('todo','in_progress','waiting','needs_approval')
      and (
        t.assignee_type='user'
        or (t.requires_approval and not exists(
          select 1 from public.hb_approvals a where a.task_id=t.id and a.status='approved'
        ))
      )
      and not exists(
        select 1 from unnest(t.dependency_ids) dep
        where not exists(select 1 from public.hb_case_tasks d where d.id=dep and d.status='done')
      )
  ) then v_next_status:='waiting_customer';
  elsif exists(select 1 from public.hb_case_tasks where case_id=p_case_id and status='waiting' and assignee_type='integration')
    then v_next_status:='waiting_external';
  elsif exists(select 1 from public.hb_case_tasks where case_id=p_case_id and status in ('in_progress','waiting') and assignee_type in ('agent','staff','partner'))
    then v_next_status:='in_progress';
  else v_next_status:='qualifying';
  end if;
  update public.hb_cases set readiness_percent=v_percent,status=v_next_status,updated_at=now()
  where id=p_case_id and (readiness_percent is distinct from v_percent or status is distinct from v_next_status);
end;
$$;

create or replace function hb_private.submit_user_task(p_task_id uuid,p_note text default null)
returns jsonb language plpgsql volatile security definer set search_path=''
as $$
declare v_user_id uuid:=(select auth.uid()); v_task public.hb_case_tasks%rowtype; v_case public.hb_cases%rowtype; v_agent_id uuid;
begin
  if v_user_id is null then raise exception 'Authentication required' using errcode='42501'; end if;
  select * into v_task from public.hb_case_tasks where id=p_task_id for update;
  if not found then raise exception 'Task not found' using errcode='P0002'; end if;
  select * into v_case from public.hb_cases where id=v_task.case_id;
  if not found or not (v_case.user_id=v_user_id or (v_case.organization_id is not null and hb_private.is_org_member(v_case.organization_id)))
    then raise exception 'Task access denied' using errcode='42501'; end if;
  if v_task.assignee_type<>'user' or v_task.status not in ('todo','in_progress')
    then raise exception 'Task is not available for user submission' using errcode='22023'; end if;
  if exists(
    select 1 from unnest(v_task.dependency_ids) dep
    where not exists(select 1 from public.hb_case_tasks d where d.id=dep and d.status='done')
  ) then raise exception 'Task dependencies are incomplete' using errcode='22023'; end if;

  update public.hb_case_tasks set status='waiting',assignee_type='agent',assignee_ref='quality',
    metadata=metadata||jsonb_build_object('user_submitted_at',now(),'user_submitted_by',v_user_id,
      'user_note',nullif(left(btrim(coalesce(p_note,'')),1000),'')),updated_at=now()
  where id=p_task_id;

  select id into v_agent_id from public.hb_agents where key='quality' and active=true limit 1;
  if v_agent_id is not null then
    insert into public.hb_agent_jobs(tenant_id,agent_id,case_id,route_key,input_refs,status,priority,idempotency_key)
    values(v_case.tenant_id,v_agent_id,v_case.id,'task-quality-review',
      jsonb_build_array(jsonb_build_object('type','case','id',v_case.id),jsonb_build_object('type','task','id',p_task_id)),
      'queued',90,'task.submitted:'||p_task_id::text||':quality')
    on conflict(idempotency_key) do nothing;
  end if;

  insert into public.hb_case_events(case_id,event_type,actor_type,actor_ref,payload)
  values(v_case.id,'task.submitted','user',v_user_id::text,jsonb_build_object('task_id',p_task_id,'note_supplied',nullif(btrim(coalesce(p_note,'')),'') is not null));
  perform hb_private.refresh_case_progress(v_case.id);
  return jsonb_build_object('task_id',p_task_id,'status','waiting','case_id',v_case.id);
end;
$$;
revoke all on function hb_private.submit_user_task(uuid,text) from public,anon;
grant execute on function hb_private.submit_user_task(uuid,text) to authenticated;

create or replace function public.hb_submit_user_task(p_task_id uuid,p_note text default null)
returns jsonb language sql volatile security invoker set search_path=''
as $$ select hb_private.submit_user_task(p_task_id,p_note) $$;
revoke all on function public.hb_submit_user_task(uuid,text) from public,anon;
grant execute on function public.hb_submit_user_task(uuid,text) to authenticated;

create or replace function hb_private.decide_task_approval(p_task_id uuid,p_decision text,p_note text default null)
returns jsonb language plpgsql volatile security definer set search_path=''
as $$
declare v_user_id uuid:=(select auth.uid()); v_task public.hb_case_tasks%rowtype; v_case public.hb_cases%rowtype;
  v_status text; v_hash text;
begin
  if v_user_id is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if p_decision not in ('approve','reject') then raise exception 'Invalid approval decision' using errcode='22023'; end if;
  select * into v_task from public.hb_case_tasks where id=p_task_id for update;
  if not found then raise exception 'Task not found' using errcode='P0002'; end if;
  select * into v_case from public.hb_cases where id=v_task.case_id;
  if not found or not (v_case.user_id=v_user_id or (v_case.organization_id is not null and hb_private.is_org_member(v_case.organization_id)))
    then raise exception 'Approval access denied' using errcode='42501'; end if;
  if not v_task.requires_approval then raise exception 'Task does not require approval' using errcode='22023'; end if;
  if exists(
    select 1 from unnest(v_task.dependency_ids) dep
    where not exists(select 1 from public.hb_case_tasks d where d.id=dep and d.status='done')
  ) then raise exception 'Task dependencies are incomplete' using errcode='22023'; end if;
  if exists(select 1 from public.hb_approvals a where a.task_id=p_task_id and a.status in ('approved','rejected'))
    then raise exception 'Task approval is already decided' using errcode='22023'; end if;

  v_status:=case when p_decision='approve' then 'approved' else 'rejected' end;
  v_hash:=encode(digest(v_case.id::text||':'||p_task_id::text||':'||coalesce(v_task.title,'')||':'||coalesce(v_task.task_type,''),'sha256'),'hex');

  insert into public.hb_approvals(user_id,organization_id,case_id,task_id,action_key,action_payload_hash,reason,status,
    requested_by_type,requested_by_ref,decided_by,requested_at,decided_at)
  values(v_user_id,v_case.organization_id,v_case.id,p_task_id,'task.execute',v_hash,
    nullif(left(btrim(coalesce(p_note,'')),1000),''),v_status,'system','hb_private.decide_task_approval',v_user_id,now(),now());

  if p_decision='approve' then
    if v_task.task_type='approval' or v_task.assignee_type='user' then
      update public.hb_case_tasks set status='done',
        metadata=metadata||jsonb_build_object('approved_at',now(),'approved_by',v_user_id),updated_at=now()
      where id=p_task_id;
    else
      update public.hb_case_tasks set status='waiting',
        metadata=metadata||jsonb_build_object('approval_granted_at',now(),'approval_granted_by',v_user_id),updated_at=now()
      where id=p_task_id;
    end if;
  else
    update public.hb_case_tasks set status='cancelled',
      metadata=metadata||jsonb_build_object('rejected_at',now(),'rejected_by',v_user_id),updated_at=now()
    where id=p_task_id;
    update public.hb_cases set status='blocked',
      metadata=metadata||jsonb_build_object('blocked_reason','approval_rejected','blocked_task_id',p_task_id,'blocked_at',now()),
      updated_at=now()
    where id=v_case.id;
  end if;

  insert into public.hb_case_events(case_id,event_type,actor_type,actor_ref,payload)
  values(v_case.id,case when p_decision='approve' then 'task.approved' else 'task.rejected' end,
    'user',v_user_id::text,jsonb_build_object('task_id',p_task_id,'decision',p_decision));
  perform hb_private.refresh_case_progress(v_case.id);

  return jsonb_build_object('task_id',p_task_id,'decision',p_decision,'case_id',v_case.id,
    'case_status',(select status from public.hb_cases where id=v_case.id));
end;
$$;
revoke all on function hb_private.decide_task_approval(uuid,text,text) from public,anon;
grant execute on function hb_private.decide_task_approval(uuid,text,text) to authenticated;

create or replace function public.hb_decide_task_approval(p_task_id uuid,p_decision text,p_note text default null)
returns jsonb language sql volatile security invoker set search_path=''
as $$ select hb_private.decide_task_approval(p_task_id,p_decision,p_note) $$;
revoke all on function public.hb_decide_task_approval(uuid,text,text) from public,anon;
grant execute on function public.hb_decide_task_approval(uuid,text,text) to authenticated;
