begin;

select plan(7);

select is(
  (select count(*)::bigint from public.hb_service_bindings where active),
  106::bigint,
  'all 106 verified services are bound to Global OS'
);

select is(
  (select count(*)::bigint from public.hb_workflow_templates where status='active'),
  106::bigint,
  'all 106 verified services have active workflows'
);

select is(
  (select count(*)::bigint from public.hb_policy_versions where status='active'),
  106::bigint,
  'all 106 verified services have active policy versions'
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

select * from finish();
rollback;
