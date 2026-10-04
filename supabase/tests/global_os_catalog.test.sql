begin;

select plan(10);

select is(
  (select count(*)::bigint from public.hb_service_bindings where active),
  114::bigint,
  'all 114 seeded services (106 existing plus eight published identities) are bound to Global OS'
);

select is(
  (select count(*)::bigint from public.hb_workflow_templates where status='active'),
  114::bigint,
  'all 114 seeded services (106 existing plus eight published identities) have active workflows'
);

select is(
  (select count(*)::bigint from public.hb_policy_versions where status='active'),
  114::bigint,
  'all 114 seeded services (106 existing plus eight published identities) have active policy versions'
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

select is((select count(*)::bigint from public.hb_policy_versions where policy_key in (select policy_key from public.hb_service_bindings where service_slug in ('ajman-business-activity-inquiry','dld-real-estate-ad-permit-dubai','legacy-service-67abe5ccf3','legacy-service-85a10469d8','legacy-service-e7f35a06d9','rta-modify-trade-license-noc-dubai','rta-new-trade-license-noc-dubai','rta-renew-trade-license-noc-dubai')) and status='active' and rules='[]'::jsonb),
 8::bigint,'navigation verification does not invent new government fees or eligibility rules');

select is((select count(*)::bigint from public.hb_workflow_templates where service_slug in ('ajman-business-activity-inquiry','dld-real-estate-ad-permit-dubai','legacy-service-67abe5ccf3','legacy-service-85a10469d8','legacy-service-e7f35a06d9','rta-modify-trade-license-noc-dubai','rta-new-trade-license-noc-dubai','rta-renew-trade-license-noc-dubai') and status='active'
 and jsonb_path_exists(definition,'$.steps[*] ? (@.requiresApproval == true && @.risk.externalSubmission == true)')
 and jsonb_path_exists(definition,'$.steps[*] ? (@.taskType == "external" && @.assigneeType == "user" && @.metadata.executionMode == "manual-official-route")')),
 8::bigint,'all restored pathways retain user approval and manual external execution');

select * from finish();
rollback;
