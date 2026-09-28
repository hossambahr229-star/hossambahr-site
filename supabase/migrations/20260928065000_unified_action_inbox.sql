-- Unified, privacy-preserving Action Inbox for authenticated users and authorized operators.

create or replace function hb_private.my_action_inbox(p_limit integer default 50)
returns table(
  source_type text,
  item_id text,
  case_id uuid,
  organization_id uuid,
  title text,
  summary text,
  priority text,
  priority_score integer,
  due_at timestamptz,
  action_key text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path=''
as $$
with me as (
  select auth.uid() as uid
),
accessible_cases as (
  select c.*
  from public.hb_cases c, me
  where me.uid is not null
    and (
      c.user_id=me.uid
      or (c.organization_id is not null and hb_private.is_org_member(c.organization_id))
      or (c.tenant_id is not null and hb_private.is_tenant_member(c.tenant_id))
    )
),
ready_user_tasks as (
  select
    'case_task'::text as source_type,
    t.id::text as item_id,
    c.id as case_id,
    c.organization_id,
    t.title,
    c.title as summary,
    case
      when t.requires_approval then 'urgent'
      when c.priority in ('urgent','high') then c.priority
      else 'normal'
    end as priority,
    case
      when t.requires_approval then 96
      when c.priority='urgent' then 94
      when c.priority='high' then 88
      when c.status='blocked' then 86
      when c.status='waiting_customer' then 82
      else 72
    end as priority_score,
    coalesce(t.due_at,c.due_at) as due_at,
    case when t.requires_approval then 'case_approval' else 'case_user_task' end as action_key,
    t.created_at
  from accessible_cases c
  join public.hb_case_tasks t on t.case_id=c.id
  where t.status in ('todo','in_progress','waiting','needs_approval')
    and (t.assignee_type='user' or t.requires_approval)
    and not exists(
      select 1
      from unnest(t.dependency_ids) dep
      where not exists(
        select 1 from public.hb_case_tasks d
        where d.id=dep and d.status='done'
      )
    )
    and (
      not t.requires_approval
      or not exists(
        select 1 from public.hb_approvals a
        where a.task_id=t.id and a.status='approved'
      )
    )
),
visible_obligations as (
  select
    'obligation'::text as source_type,
    o.id::text as item_id,
    o.related_case_id as case_id,
    o.organization_id,
    o.title,
    case
      when o.due_at<now() then 'متأخر'
      when o.due_at<=now()+interval '7 days' then 'مستحق خلال 7 أيام'
      when o.due_at<=now()+interval '30 days' then 'مستحق خلال 30 يومًا'
      else 'استحقاق قادم'
    end as summary,
    case
      when o.due_at<now() then 'urgent'
      when o.due_at<=now()+interval '7 days' then 'high'
      else 'normal'
    end as priority,
    case
      when o.due_at<now() then 100
      when o.due_at<=now()+interval '7 days' then 90
      when o.due_at<=now()+interval '30 days' then 76
      else 58
    end as priority_score,
    o.due_at,
    'obligation'::text as action_key,
    o.created_at
  from public.hb_obligations o, me
  where me.uid is not null
    and o.status in ('open','snoozed')
    and o.due_at<=now()+interval '60 days'
    and (
      o.user_id=me.uid
      or (o.organization_id is not null and hb_private.is_org_member(o.organization_id))
    )
),
operator_internal_review as (
  select
    'internal_review'::text as source_type,
    t.id::text as item_id,
    c.id as case_id,
    c.organization_id,
    t.title,
    c.title as summary,
    'normal'::text as priority,
    68 as priority_score,
    t.due_at,
    'owner_internal_review'::text as action_key,
    t.created_at
  from public.hb_case_tasks t
  join public.hb_cases c on c.id=t.case_id
  join public.hb_tenant_members tm
    on tm.tenant_id=c.tenant_id
   and tm.user_id=(select uid from me)
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
),
operator_external_execution as (
  select
    'external_execution'::text as source_type,
    t.id::text as item_id,
    c.id as case_id,
    c.organization_id,
    t.title,
    c.title as summary,
    'high'::text as priority,
    84 as priority_score,
    t.due_at,
    'owner_external_execution'::text as action_key,
    t.created_at
  from public.hb_case_tasks t
  join public.hb_cases c on c.id=t.case_id
  join public.hb_tenant_members tm
    on tm.tenant_id=c.tenant_id
   and tm.user_id=(select uid from me)
   and tm.role in ('owner','admin','operator')
  where t.status='waiting'
    and t.requires_approval=true
    and (t.assignee_type='integration' or t.task_type='external')
    and exists(
      select 1 from public.hb_approvals a
      where a.task_id=t.id and a.status='approved'
    )
    and not exists(
      select 1
      from unnest(t.dependency_ids) dep
      where not exists(
        select 1 from public.hb_case_tasks d
        where d.id=dep and d.status='done'
      )
    )
),
unread_notifications as (
  select
    'notification'::text as source_type,
    n.id::text as item_id,
    case when n.entity_type='case' and n.entity_id ~* '^[0-9a-f-]{36}$' then n.entity_id::uuid else null end as case_id,
    null::uuid as organization_id,
    n.title,
    coalesce(n.body,'') as summary,
    n.priority,
    case n.priority
      when 'urgent' then 92
      when 'high' then 80
      when 'normal' then 55
      else 40
    end as priority_score,
    n.deliver_after as due_at,
    'notification'::text as action_key,
    n.created_at
  from public.hb_notifications n, me
  where me.uid is not null
    and n.user_id=me.uid
    and n.status='unread'
    and n.deliver_after<=now()
),
all_items as (
  select * from ready_user_tasks
  union all
  select * from visible_obligations
  union all
  select * from operator_internal_review
  union all
  select * from operator_external_execution
  union all
  select * from unread_notifications
)
select
  source_type,item_id,case_id,organization_id,title,summary,priority,
  priority_score,due_at,action_key,created_at
from all_items
order by
  priority_score desc,
  due_at nulls last,
  created_at asc
limit least(greatest(coalesce(p_limit,50),1),100)
$$;

revoke all on function hb_private.my_action_inbox(integer) from public,anon;
grant execute on function hb_private.my_action_inbox(integer) to authenticated;

create or replace function public.hb_my_action_inbox(p_limit integer default 50)
returns table(
  source_type text,
  item_id text,
  case_id uuid,
  organization_id uuid,
  title text,
  summary text,
  priority text,
  priority_score integer,
  due_at timestamptz,
  action_key text,
  created_at timestamptz
)
language sql
stable
security invoker
set search_path=''
as $$
  select * from hb_private.my_action_inbox(p_limit)
$$;

revoke all on function public.hb_my_action_inbox(integer) from public,anon;
grant execute on function public.hb_my_action_inbox(integer) to authenticated;
