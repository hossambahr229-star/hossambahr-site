begin;

select plan(16);

select is(
  (select count(*)::bigint from public.hb_service_bindings where active),
  116::bigint,
  'all 116 seeded services (114 preserved plus two reviewed SIRA identities) are bound to Global OS'
);

select is(
  (select count(*)::bigint from public.hb_workflow_templates where status='active'),
  116::bigint,
  'all 116 seeded services (114 preserved plus two reviewed SIRA identities) have active workflows'
);

select is(
  (select count(*)::bigint from public.hb_policy_versions where status='active'),
  116::bigint,
  'all 116 seeded services (114 preserved plus two reviewed SIRA identities) have active policy versions'
);

select is(
  (select count(*)::bigint from public.hb_agents where active),
  9::bigint,
  'nine controlled AI agent identities are seeded'
);

select ok(
  not exists(
    select 1
    from pg_class c
    join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public'
      and c.relname like 'hb\_%' escape '\'
      and c.relkind='r'
      and not c.relrowsecurity
  ),
  'RLS is enabled on every public hb_* table'
);

select ok(
  not exists(
    select 1
    from pg_constraint c
    join pg_class cls on cls.oid=c.conrelid
    join pg_namespace n on n.oid=cls.relnamespace
    where c.contype='f'
      and n.nspname='public'
      and cls.relname like 'hb\_%' escape '\'
      and not exists(
        select 1 from pg_index i
        where i.indrelid=c.conrelid
          and i.indisvalid
          and i.indisready
          and (i.indkey::smallint[])[0:cardinality(c.conkey)-1]=c.conkey
      )
  ),
  'every Global OS foreign key has a covering index'
);

select ok(
  not exists(
    select 1
    from pg_policies
    where schemaname='public'
      and tablename like 'hb\_%' escape '\'
      and (
        (qual is not null and qual like '%auth.uid()%' and qual not ilike '%select auth.uid%')
        or
        (with_check is not null and with_check like '%auth.uid()%' and with_check not ilike '%select auth.uid%')
      )
  ),
  'Global OS RLS policies cache auth.uid() through scalar SELECT'
);


select is((select count(*)::bigint from public.hb_service_bindings b
 join public.hb_authorities a on a.id=b.authority_id and a.authority_key=b.authority_key and a.country_pack_id=b.country_pack_id
 join public.hb_policy_versions p on p.policy_key=b.policy_key and p.jurisdiction_id=b.jurisdiction_id and p.country_pack_id=b.country_pack_id and p.status='active'
 join public.hb_workflow_templates w on w.workflow_key=b.workflow_key and w.jurisdiction_id=b.jurisdiction_id and w.country_pack_id=b.country_pack_id and w.status='active'
 where b.active and b.service_slug in ('ajman-business-activity-inquiry','dld-real-estate-ad-permit-dubai','legacy-service-67abe5ccf3','legacy-service-85a10469d8','legacy-service-e7f35a06d9','rta-modify-trade-license-noc-dubai','rta-new-trade-license-noc-dubai','rta-renew-trade-license-noc-dubai') and b.metadata->>'public_catalog'='true'
 and exists(select 1 from public.hb_policy_sources s where s.id=any(p.source_ids) and s.authority_id=a.id and s.jurisdiction_id=b.jurisdiction_id and s.active and s.source_url=b.metadata->>'officialUrl')),
 8::bigint,'all eight restored identities retain authority, jurisdiction, policy, workflow and official source');

select is((select count(*)::bigint from public.hb_policy_versions where policy_key in (select policy_key from public.hb_service_bindings where service_slug in ('ajman-business-activity-inquiry','legacy-service-67abe5ccf3','legacy-service-85a10469d8','legacy-service-e7f35a06d9','rta-new-trade-license-noc-dubai')) and status='active' and rules='[]'::jsonb),
 5::bigint,'navigation-only identities without reviewed field publication retain empty policies');

select is((select count(*)::bigint from public.hb_workflow_templates where service_slug in ('ajman-business-activity-inquiry','dld-real-estate-ad-permit-dubai','legacy-service-67abe5ccf3','legacy-service-85a10469d8','legacy-service-e7f35a06d9','rta-modify-trade-license-noc-dubai','rta-new-trade-license-noc-dubai','rta-renew-trade-license-noc-dubai') and status='active'
 and jsonb_path_exists(definition,'$.steps[*] ? (@.requiresApproval == true && @.risk.externalSubmission == true)')
 and jsonb_path_exists(definition,'$.steps[*] ? (@.taskType == "external" && @.assigneeType == "user" && @.metadata.executionMode == "manual-official-route")')),
 8::bigint,'all restored pathways retain user approval and manual external execution');

select ok(exists(select 1 from public.hb_policy_versions p join public.hb_policy_sources s on s.id=any(p.source_ids)
 where p.policy_key='service:dld-real-estate-ad-permit-dubai' and p.status='active' and p.version=2
 and p.reviewed_by='official-dld-ad-card-review-2026-10-11'
 and jsonb_array_length(p.rules)=8 and s.source_url='https://dubailand.gov.ae/en/eservices/real-estate-ad-permit/'
 and s.metadata->>'verification_scope'='documents_conditions_fees_duration' and s.monitor_enabled and not s.review_required
 and not exists(select 1 from jsonb_array_elements(p.rules) r where not(r->'sourceRefs' ? s.source_url))
 and exists(select 1 from jsonb_array_elements(p.rules) r where r->>'id'='fees' and r->>'reason' like '%5000 AED%' and r->>'reason' like '%1000 AED%' and r->>'reason' like '%10,200%' and r->>'reason' like '%1,020%')
 and exists(select 1 from jsonb_array_elements(p.rules) r where r->>'id'='duration' and r->>'reason'='يوم عمل واحد.')),
 'reviewed DLD ad policy has exact official sources, distinct permit fees and documented duration');

select ok(exists(select 1 from public.hb_policy_versions where policy_key='service:dld-real-estate-ad-permit-dubai'
 and version=1 and status='retired' and rules='[]'::jsonb)
 and exists(select 1 from public.hb_service_bindings where service_slug='dld-real-estate-ad-permit-dubai'
 and active and metadata->>'governmentDetailsVerified'='true'),
 'DLD review retains the empty historical navigation policy and marks only its reviewed binding');
select ok(exists(select 1 from public.hb_policy_versions p join public.hb_policy_sources s on s.id=any(p.source_ids)
 where p.policy_key='service:rta-modify-trade-license-noc-dubai' and p.status='active' and p.version=2
 and p.reviewed_by='reviewed-rta-noc-field-sync-2026-10-12'
 and jsonb_array_length(p.rules)=2
 and s.source_url='https://www.rta.ae/wps/portal/rta/ae/home/rta-services/service-details?serviceId=534' and s.authority_key='rta-dubai'
 and not exists(select 1 from jsonb_array_elements(p.rules) r where not(r->'sourceRefs' ? s.source_url))
 and not exists(select 1 from jsonb_array_elements(p.rules) r where r->>'id' not in ('fees','duration'))
 and exists(select 1 from jsonb_array_elements(p.rules) r where r->>'id'='fees' and r->>'reason'='تختلف الرسوم حسب نوع التعديل ورمز نشاط النقل؛ تعرض بطاقة RTA جدول الرسوم التفصيلي، ورسوم حذف النشاط 220 درهمًا وفق البطاقة الحالية.')
 and exists(select 1 from jsonb_array_elements(p.rules) r where r->>'id'='duration' and r->>'reason'='من 3 إلى 15 يوم عمل بحسب الموافقات المطلوبة.')
 ) and exists(select 1 from public.hb_policy_versions where policy_key='service:rta-modify-trade-license-noc-dubai' and version=1 and status='retired' and rules='[]'::jsonb),
 'RTA modification publishes exact conditional fee notes and duration and retains the empty navigation history');
select ok(exists(select 1 from public.hb_policy_versions p join public.hb_policy_sources s on s.id=any(p.source_ids)
 where p.policy_key='service:rta-renew-trade-license-noc-dubai' and p.status='active' and p.version=2
 and p.reviewed_by='reviewed-rta-noc-field-sync-2026-10-12'
 and jsonb_array_length(p.rules)=1
 and s.source_url='https://www.rta.ae/wps/portal/rta/ae/home/rta-services/service-details?serviceId=438' and s.authority_key='rta-dubai'
 and not exists(select 1 from jsonb_array_elements(p.rules) r where not(r->'sourceRefs' ? s.source_url))
 and not exists(select 1 from jsonb_array_elements(p.rules) r where r->>'id' not in ('fees'))
 and exists(select 1 from jsonb_array_elements(p.rules) r where r->>'id'='fees' and r->>'reason'='تختلف الرسوم حسب رمز نشاط النقل التجاري وتظهر في جدول النشاط وصفحة الدفع الرسمية.')
 ) and exists(select 1 from public.hb_policy_versions where policy_key='service:rta-renew-trade-license-noc-dubai' and version=1 and status='retired' and rules='[]'::jsonb),
 'RTA renewal publishes only exact conditional fee notes, without duration or eligibility and retains the empty navigation history');

select is((select count(*)::bigint from public.hb_service_bindings b
 join public.hb_authorities a on a.id=b.authority_id and a.authority_key='sira-dubai'
 join public.hb_jurisdictions j on j.id=b.jurisdiction_id and j.code='AE-DU'
 join public.hb_policy_versions p on p.policy_key=b.policy_key and p.jurisdiction_id=b.jurisdiction_id and p.status='active'
 join public.hb_policy_sources src on src.id=any(p.source_ids) and src.authority_id=a.id and src.active
 where b.active and b.service_slug in ('sira-new-security-activity-license-dubai','sira-security-system-certification-dubai')
 and src.source_url=b.metadata->>'officialUrl'
 and not exists(select 1 from jsonb_array_elements(p.rules) rule where not(rule->'sourceRefs' ? src.source_url))),
 2::bigint,'both SIRA transactions retain Dubai authority, exact official card and fact-specific source references');
select ok(exists(select 1 from public.hb_policy_versions where policy_key='service:sira-new-security-activity-license-dubai' and status='active'
 and exists(select 1 from jsonb_array_elements(rules) r where r->>'id'='fees' and r->>'reason' like '%لا تعتبر 120%' and r->>'reason' like '%حسب النشاط%'))
 and exists(select 1 from public.hb_policy_versions where policy_key='service:sira-security-system-certification-dubai' and status='active'
 and exists(select 1 from jsonb_array_elements(rules) r where r->>'id'='conditions' and r->>'reason' like '%للمنشآت والمباني في دبي%')),
 'activity-dependent licence charges are not a universal total or substituted for establishment certification');

select * from finish();
rollback;
