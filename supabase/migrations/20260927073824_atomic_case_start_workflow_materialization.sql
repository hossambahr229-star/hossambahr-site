-- Atomically create a case and materialize its workflow tasks.
create or replace function hb_private.start_case(
  p_goal text,
  p_title text default null,
  p_service_slug text default null,
  p_organization_id uuid default null
)
returns jsonb
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_case_id uuid; v_title text; v_binding record; v_definition jsonb; v_steps jsonb;
  v_step jsonb; v_step_key text; v_id_map jsonb := '{}'::jsonb; v_task_id uuid;
  v_dependency_ids uuid[]; v_task_count integer := 0; v_workflow_key text;
begin
  if v_user_id is null then raise exception 'Authentication required' using errcode='42501'; end if;
  p_goal := btrim(coalesce(p_goal,''));
  if char_length(p_goal) < 3 or char_length(p_goal) > 1200 then raise exception 'Invalid case goal' using errcode='22023'; end if;
  v_title := left(coalesce(nullif(btrim(p_title),''),p_goal),180);
  if p_organization_id is not null and not hb_private.is_org_member(p_organization_id) then raise exception 'Organization access denied' using errcode='42501'; end if;

  if p_service_slug is not null then
    select b.jurisdiction_id,b.authority_key,b.workflow_key,b.metadata into v_binding
    from public.hb_service_bindings b
    where b.service_slug=p_service_slug and b.active=true order by b.id limit 1;
    if found and v_binding.workflow_key is not null then
      v_workflow_key := v_binding.workflow_key;
      select w.definition into v_definition
      from public.hb_workflow_templates w
      where w.workflow_key=v_binding.workflow_key and w.status='active'
        and (w.effective_until is null or w.effective_until>now())
      order by w.version desc limit 1;
    end if;
  end if;

  if v_definition is null then
    v_workflow_key := 'generic:intake';
    v_definition := jsonb_build_object('id','generic:intake','version',1,'steps',jsonb_build_array(
      jsonb_build_object('key','intake','title','تأكيد بيانات الطلب والحالة','taskType','intake','assigneeType','agent','metadata',jsonb_build_object('agent','intake')),
      jsonb_build_object('key','requirements','title','تحديد وجمع المتطلبات والمستندات','taskType','requirement','assigneeType','user','dependsOn',jsonb_build_array('intake')),
      jsonb_build_object('key','quality-review','title','مراجعة اكتمال البيانات والمتطلبات','taskType','review','assigneeType','agent','dependsOn',jsonb_build_array('requirements'),'metadata',jsonb_build_object('agent','quality')),
      jsonb_build_object('key','execution-approval','title','اعتماد خطة التنفيذ قبل أي إجراء خارجي','taskType','approval','assigneeType','user','dependsOn',jsonb_build_array('quality-review'),'requiresApproval',true),
      jsonb_build_object('key','completion','title','توثيق النتيجة وإغلاق المعاملة','taskType','completion','assigneeType','system','dependsOn',jsonb_build_array('execution-approval'))
    ));
  end if;

  insert into public.hb_cases(user_id,organization_id,jurisdiction_id,service_slug,goal,title,status,priority,readiness_percent,metadata)
  values(v_user_id,p_organization_id,case when v_binding is null then null else v_binding.jurisdiction_id end,
    nullif(btrim(p_service_slug),''),p_goal,v_title,'qualifying','normal',0,
    jsonb_build_object('workflow_key',v_workflow_key,'authority_key',case when v_binding is null then null else v_binding.authority_key end))
  returning id into v_case_id;

  v_steps := coalesce(v_definition->'steps','[]'::jsonb);
  for v_step in select value from jsonb_array_elements(v_steps) loop
    v_step_key := coalesce(nullif(v_step->>'key',''),'step-'||(v_task_count+1)::text);
    v_task_id := gen_random_uuid();
    v_id_map := v_id_map || jsonb_build_object(v_step_key,v_task_id::text);
    v_task_count := v_task_count + 1;
  end loop;

  v_task_count := 0;
  for v_step in select value from jsonb_array_elements(v_steps) loop
    v_step_key := coalesce(nullif(v_step->>'key',''),'step-'||(v_task_count+1)::text);
    v_task_id := (v_id_map->>v_step_key)::uuid;
    select coalesce(array_agg((v_id_map->>d)::uuid),'{}'::uuid[]) into v_dependency_ids
    from jsonb_array_elements_text(coalesce(v_step->'dependsOn','[]'::jsonb)) as dep(d) where v_id_map ? d;
    insert into public.hb_case_tasks(id,case_id,title,task_type,status,assignee_type,assignee_ref,requires_approval,dependency_ids,metadata)
    values(v_task_id,v_case_id,left(coalesce(v_step->>'title',v_step_key),300),coalesce(nullif(v_step->>'taskType',''),'manual'),'todo',
      case when v_step->>'assigneeType' in ('user','staff','partner','agent','system','integration') then v_step->>'assigneeType' else 'system' end,
      case when v_step->>'assigneeType'='agent' then v_step->'metadata'->>'agent' else null end,
      coalesce((v_step->>'requiresApproval')::boolean,false),v_dependency_ids,
      coalesce(v_step->'metadata','{}'::jsonb)||jsonb_build_object('workflow_step_key',v_step_key));
    v_task_count := v_task_count + 1;
  end loop;

  insert into public.hb_case_events(case_id,event_type,actor_type,actor_ref,payload)
  values(v_case_id,'case.workflow_materialized','system','hb_private.start_case',jsonb_build_object('workflow_key',v_workflow_key,'task_count',v_task_count));

  return jsonb_build_object('id',v_case_id,'title',v_title,'status','qualifying','workflow_key',v_workflow_key,'task_count',v_task_count);
end;
$$;

revoke all on function hb_private.start_case(text,text,text,uuid) from public,anon;
grant execute on function hb_private.start_case(text,text,text,uuid) to authenticated;

create or replace function public.hb_start_case(p_goal text,p_title text default null,p_service_slug text default null,p_organization_id uuid default null)
returns jsonb language sql volatile security invoker set search_path=''
as $$ select hb_private.start_case(p_goal,p_title,p_service_slug,p_organization_id) $$;

revoke all on function public.hb_start_case(text,text,text,uuid) from public,anon;
grant execute on function public.hb_start_case(text,text,text,uuid) to authenticated;
