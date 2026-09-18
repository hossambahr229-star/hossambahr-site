begin;

select plan(18);

select has_table('public','hb_jurisdictions','jurisdictions table exists');
select has_table('public','hb_organizations','organizations table exists');
select has_table('public','hb_cases','cases table exists');
select has_table('public','hb_documents','documents table exists');
select has_table('public','hb_consents','consents table exists');
select has_table('public','hb_agents','agents table exists');
select has_table('public','hb_audit_events','audit table exists');
select has_table('public','hb_graph_nodes','business graph nodes exist');
select has_table('public','hb_approvals','approval gates exist');
select has_table('public','hb_tenants','tenant isolation exists');
select has_table('public','hb_protocol_transactions','protocol transactions exist');
select has_table('public','hb_compliance_findings','compliance findings exist');

select ok(
  (select relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='hb_cases'),
  'RLS is enabled on cases'
);

select ok(
  (select relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='hb_documents'),
  'RLS is enabled on documents'
);

select ok(
  (select relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='hb_payment_intents'),
  'RLS is enabled on payment intents'
);

select ok(
  not has_table_privilege('anon','public.hb_payment_intents','INSERT'),
  'anonymous users cannot create payment intents'
);

select ok(
  not has_table_privilege('authenticated','public.hb_outbox_events','INSERT'),
  'clients cannot write transactional outbox events'
);

select ok(
  exists(select 1 from public.hb_jurisdictions where code='AE'),
  'UAE country pack root is seeded'
);

select * from finish();
rollback;
