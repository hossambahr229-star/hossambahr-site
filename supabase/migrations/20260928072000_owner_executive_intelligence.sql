-- Tenant-scoped executive intelligence for the verified platform owner.
-- Aggregated operational/business metrics only; no employee or partner scoring.

create or replace function hb_private.owner_executive_snapshot(
  p_tenant_key text default 'hossambahr'
)
returns jsonb
language plpgsql
stable
security definer
set search_path=''
as $$
declare
  v_tenant_id uuid;
  v_open_leads integer;
  v_new_leads_30d integer;
  v_won_leads_30d integer;
  v_open_cases integer;
  v_blocked_cases integer;
  v_waiting_customer integer;
  v_waiting_external integer;
  v_completed_cases_30d integer;
  v_open_conversations integer;
  v_waiting_team integer;
  v_critical_findings integer;
  v_high_findings integer;
  v_active_assignments integer;
  v_marketplace_active integer;
  v_marketplace_disputed integer;
  v_overdue_obligations integer;
  v_due_30_obligations integer;
  v_quote_pipeline jsonb;
  v_collected_30d jsonb;
  v_refunded_30d jsonb;
  v_lead_value jsonb;
  v_top_services jsonb;
  v_lead_sources jsonb;
begin
  if not hb_private.is_platform_owner() then
    raise exception 'Permission denied' using errcode='42501';
  end if;

  select id into v_tenant_id
  from public.hb_tenants
  where tenant_key=p_tenant_key
  limit 1;

  if v_tenant_id is null then
    raise exception 'Tenant not found' using errcode='P0002';
  end if;

  select
    count(*) filter(where status in ('new','qualified','quoted')),
    count(*) filter(where created_at>=now()-interval '30 days'),
    count(*) filter(where status='won' and updated_at>=now()-interval '30 days')
  into v_open_leads,v_new_leads_30d,v_won_leads_30d
  from public.hb_leads
  where tenant_id=v_tenant_id;

  select
    count(*) filter(where status not in ('completed','cancelled')),
    count(*) filter(where status='blocked'),
    count(*) filter(where status='waiting_customer'),
    count(*) filter(where status='waiting_external'),
    count(*) filter(where status='completed' and updated_at>=now()-interval '30 days')
  into v_open_cases,v_blocked_cases,v_waiting_customer,v_waiting_external,v_completed_cases_30d
  from public.hb_cases
  where tenant_id=v_tenant_id;

  select
    count(*) filter(where status<>'closed'),
    count(*) filter(where status='waiting_team')
  into v_open_conversations,v_waiting_team
  from public.hb_conversations
  where tenant_id=v_tenant_id;

  select
    count(*) filter(where severity='critical' and status in ('open','acknowledged','remediating')),
    count(*) filter(where severity='high' and status in ('open','acknowledged','remediating'))
  into v_critical_findings,v_high_findings
  from public.hb_compliance_findings
  where tenant_id=v_tenant_id;

  select count(*)
  into v_active_assignments
  from public.hb_assignments a
  join public.hb_cases c on c.id=a.case_id
  where c.tenant_id=v_tenant_id
    and a.status in ('assigned','accepted','working');

  select
    count(*) filter(where mo.status in ('requested','accepted','in_progress','delivered','disputed')),
    count(*) filter(where mo.status='disputed')
  into v_marketplace_active,v_marketplace_disputed
  from public.hb_marketplace_orders mo
  left join public.hb_cases c on c.id=mo.case_id
  left join public.hb_organizations o on o.id=mo.organization_id
  where c.tenant_id=v_tenant_id or o.tenant_id=v_tenant_id;

  select
    count(*) filter(where ob.status in ('open','snoozed') and ob.due_at<now()),
    count(*) filter(where ob.status in ('open','snoozed') and ob.due_at between now() and now()+interval '30 days')
  into v_overdue_obligations,v_due_30_obligations
  from public.hb_obligations ob
  join public.hb_organizations o on o.id=ob.organization_id
  where o.tenant_id=v_tenant_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'currency',q.currency,
    'amount',q.amount,
    'count',q.quote_count
  ) order by q.currency),'[]'::jsonb)
  into v_quote_pipeline
  from (
    select currency,sum(total)::numeric as amount,count(*) as quote_count
    from public.hb_quotes q
    left join public.hb_cases c on c.id=q.case_id
    left join public.hb_organizations o on o.id=q.organization_id
    where q.status in ('sent','accepted')
      and (c.tenant_id=v_tenant_id or o.tenant_id=v_tenant_id)
    group by currency
  ) q;

  select coalesce(jsonb_agg(jsonb_build_object(
    'currency',p.currency,
    'amount',p.amount,
    'count',p.payment_count
  ) order by p.currency),'[]'::jsonb)
  into v_collected_30d
  from (
    select currency,sum(amount)::numeric as amount,count(*) as payment_count
    from public.hb_payment_intents p
    left join public.hb_cases c on c.id=p.case_id
    left join public.hb_organizations o on o.id=p.organization_id
    where p.status='succeeded'
      and p.updated_at>=now()-interval '30 days'
      and (c.tenant_id=v_tenant_id or o.tenant_id=v_tenant_id)
    group by currency
  ) p;

  select coalesce(jsonb_agg(jsonb_build_object(
    'currency',p.currency,
    'amount',p.amount,
    'count',p.payment_count
  ) order by p.currency),'[]'::jsonb)
  into v_refunded_30d
  from (
    select currency,sum(amount)::numeric as amount,count(*) as payment_count
    from public.hb_payment_intents p
    left join public.hb_cases c on c.id=p.case_id
    left join public.hb_organizations o on o.id=p.organization_id
    where p.status='refunded'
      and p.updated_at>=now()-interval '30 days'
      and (c.tenant_id=v_tenant_id or o.tenant_id=v_tenant_id)
    group by currency
  ) p;

  select coalesce(jsonb_agg(jsonb_build_object(
    'currency',l.currency,
    'amount',l.amount,
    'count',l.lead_count
  ) order by l.currency),'[]'::jsonb)
  into v_lead_value
  from (
    select currency,sum(coalesce(estimated_value,0))::numeric as amount,count(*) as lead_count
    from public.hb_leads
    where tenant_id=v_tenant_id
      and status in ('new','qualified','quoted')
    group by currency
  ) l;

  select coalesce(jsonb_agg(jsonb_build_object(
    'service_slug',s.service_slug,
    'service_name',s.service_name,
    'count',s.case_count
  ) order by s.case_count desc,s.service_slug),'[]'::jsonb)
  into v_top_services
  from (
    select
      coalesce(c.service_slug,'general') as service_slug,
      coalesce(b.metadata->>'name',c.service_slug,'مسار عام') as service_name,
      count(*) as case_count
    from public.hb_cases c
    left join public.hb_service_bindings b
      on b.service_slug=c.service_slug and b.active=true
    where c.tenant_id=v_tenant_id
      and c.created_at>=now()-interval '30 days'
    group by coalesce(c.service_slug,'general'),coalesce(b.metadata->>'name',c.service_slug,'مسار عام')
    order by case_count desc
    limit 10
  ) s;

  select coalesce(jsonb_agg(jsonb_build_object(
    'source',s.source,
    'count',s.lead_count
  ) order by s.lead_count desc,s.source),'[]'::jsonb)
  into v_lead_sources
  from (
    select coalesce(nullif(source,''),'unknown') as source,count(*) as lead_count
    from public.hb_leads
    where tenant_id=v_tenant_id
      and created_at>=now()-interval '30 days'
    group by coalesce(nullif(source,''),'unknown')
    order by lead_count desc
    limit 10
  ) s;

  return jsonb_build_object(
    'tenant_key',p_tenant_key,
    'generated_at',now(),
    'leads',jsonb_build_object(
      'open',v_open_leads,
      'new_30d',v_new_leads_30d,
      'won_30d',v_won_leads_30d,
      'open_value_by_currency',v_lead_value,
      'sources_30d',v_lead_sources
    ),
    'sales',jsonb_build_object(
      'quote_pipeline_by_currency',v_quote_pipeline,
      'collected_30d_by_currency',v_collected_30d,
      'refunded_30d_by_currency',v_refunded_30d
    ),
    'operations',jsonb_build_object(
      'open_cases',v_open_cases,
      'blocked_cases',v_blocked_cases,
      'waiting_customer',v_waiting_customer,
      'waiting_external',v_waiting_external,
      'completed_30d',v_completed_cases_30d,
      'active_assignments',v_active_assignments,
      'open_conversations',v_open_conversations,
      'waiting_team_conversations',v_waiting_team,
      'top_services_30d',v_top_services
    ),
    'compliance',jsonb_build_object(
      'critical_open',v_critical_findings,
      'high_open',v_high_findings,
      'overdue_obligations',v_overdue_obligations,
      'due_30d_obligations',v_due_30_obligations
    ),
    'marketplace',jsonb_build_object(
      'active_orders',v_marketplace_active,
      'disputed_orders',v_marketplace_disputed
    ),
    'attention',jsonb_build_object(
      'critical_count',
        v_blocked_cases
        + v_critical_findings
        + v_marketplace_disputed
        + v_overdue_obligations,
      'customer_waiting_count',v_waiting_customer,
      'team_waiting_count',v_waiting_team,
      'external_waiting_count',v_waiting_external
    )
  );
end;
$$;

revoke all on function hb_private.owner_executive_snapshot(text) from public,anon;
grant execute on function hb_private.owner_executive_snapshot(text) to authenticated;

create or replace function public.hb_owner_executive_snapshot(
  p_tenant_key text default 'hossambahr'
)
returns jsonb
language sql
stable
security invoker
set search_path=''
as $$
  select hb_private.owner_executive_snapshot(p_tenant_key)
$$;

revoke all on function public.hb_owner_executive_snapshot(text) from public,anon;
grant execute on function public.hb_owner_executive_snapshot(text) to authenticated;
