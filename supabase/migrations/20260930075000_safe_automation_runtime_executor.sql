-- Safe allowlisted automation runtime.
-- Only low/medium risk, non-sensitive scopes can execute automatically.
-- Current allowlist contains notification:create only.

create or replace function hb_private.run_safe_automation_policy(
  p_policy_id uuid,
  p_user_id uuid,
  p_case_id uuid default null,
  p_idempotency_key text default null,
  p_input jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_policy public.hb_automation_policies%rowtype;
  v_authorization_id uuid;
  v_run_id uuid;
  v_notification_id uuid;
  v_idempotency text;
  v_block text;
  v_title text;
  v_body text;
  v_category text;
  v_priority text;
begin
  select * into v_policy
  from public.hb_automation_policies
  where id=p_policy_id;

  if not found then
    raise exception 'Automation policy not found' using errcode='P0002';
  end if;

  v_idempotency:=coalesce(
    nullif(btrim(coalesce(p_idempotency_key,'')),''),
    'automation:'||p_policy_id::text||':'||p_user_id::text||':'||coalesce(p_case_id::text,'none')
  );

  if exists(select 1 from public.hb_automation_runs where idempotency_key=v_idempotency) then
    return (
      select jsonb_build_object(
        'run_id',r.id,'status',r.status,'block_reason',r.block_reason,'output',r.output,'idempotent_replay',true
      )
      from public.hb_automation_runs r
      where r.idempotency_key=v_idempotency
    );
  end if;

  if not v_policy.enabled then
    v_block:='policy_disabled';
  elsif v_policy.owner_user_id is not null and v_policy.owner_user_id<>p_user_id then
    v_block:='policy_owner_mismatch';
  elsif v_policy.risk_class not in ('low','medium') then
    v_block:='risk_requires_explicit_approval';
  elsif public.hb_scope_is_always_sensitive(v_policy.required_scope) then
    v_block:='sensitive_scope_requires_explicit_approval';
  elsif v_policy.action_type not in ('notification:create') then
    v_block:='action_executor_not_allowlisted';
  end if;

  if v_block is null and v_policy.requires_standing_authorization then
    v_authorization_id:=public.hb_effective_standing_authorization(
      p_user_id,
      v_policy.required_scope,
      v_policy.organization_id
    );
    if v_authorization_id is null then
      v_block:='standing_authorization_required';
    end if;
  end if;

  insert into public.hb_automation_runs(
    policy_id,user_id,organization_id,case_id,authorization_id,status,idempotency_key,input,block_reason,started_at,completed_at
  )
  values(
    v_policy.id,p_user_id,v_policy.organization_id,p_case_id,v_authorization_id,
    case when v_block is null then 'running' else 'blocked' end,
    v_idempotency,coalesce(p_input,'{}'::jsonb),v_block,
    case when v_block is null then now() else null end,
    case when v_block is null then null else now() end
  )
  returning id into v_run_id;

  insert into public.hb_automation_events(automation_run_id,event_type,actor_type,actor_ref,payload)
  values(
    v_run_id,
    case when v_block is null then 'automation.started' else 'automation.blocked' end,
    'system','hb_private.run_safe_automation_policy',
    jsonb_build_object('policy_key',v_policy.policy_key,'required_scope',v_policy.required_scope,'block_reason',v_block)
  );

  if v_block is not null then
    return jsonb_build_object('run_id',v_run_id,'status','blocked','block_reason',v_block);
  end if;

  if v_policy.action_type='notification:create' then
    v_category:=coalesce(nullif(v_policy.action_spec->>'category',''),'automation');
    v_title:=left(coalesce(nullif(v_policy.action_spec->>'title',''),'تنبيه آلي'),200);
    v_body:=left(coalesce(v_policy.action_spec->>'body',''),1000);
    v_priority:=case
      when v_policy.action_spec->>'priority' in ('low','normal','high','urgent')
        then v_policy.action_spec->>'priority'
      else 'normal'
    end;

    insert into public.hb_notifications(
      user_id,category,title,body,entity_type,entity_id,priority,status,deliver_after
    )
    values(
      p_user_id,v_category,v_title,nullif(v_body,''),
      case when p_case_id is null then 'automation' else 'case' end,
      coalesce(p_case_id::text,v_run_id::text),
      v_priority,'unread',now()
    )
    returning id into v_notification_id;
  end if;

  update public.hb_automation_runs
  set status='completed',
      output=jsonb_build_object(
        'action_type',v_policy.action_type,
        'notification_id',v_notification_id,
        'safe_executor',true
      ),
      completed_at=now()
  where id=v_run_id;

  insert into public.hb_automation_events(automation_run_id,event_type,actor_type,actor_ref,payload)
  values(
    v_run_id,'automation.completed','system','hb_private.run_safe_automation_policy',
    jsonb_build_object('action_type',v_policy.action_type,'notification_id',v_notification_id)
  );

  return jsonb_build_object(
    'run_id',v_run_id,
    'status','completed',
    'notification_id',v_notification_id,
    'authorization_id',v_authorization_id
  );
end;
$$;

revoke all on function hb_private.run_safe_automation_policy(uuid,uuid,uuid,text,jsonb)
from public,anon,authenticated;
grant execute on function hb_private.run_safe_automation_policy(uuid,uuid,uuid,text,jsonb)
to service_role;
