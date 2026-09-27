begin;

select plan(12);

select ok(
  to_regclass('public.hb_web_analytics_events') is not null,
  'web analytics event table exists'
);

select ok(
  (select relrowsecurity from pg_class where oid='public.hb_web_analytics_events'::regclass),
  'web analytics table has RLS enabled'
);

select ok(
  exists(
    select 1
    from pg_policies
    where schemaname='public'
      and tablename='hb_web_analytics_events'
      and policyname='platform owner reads analytics'
      and cmd='SELECT'
  ),
  'owner-only analytics read policy exists'
);

select ok(
  position('e.path !~ ''^/__''' in pg_get_functiondef('public.hb_web_analytics_summary(integer)'::regprocedure)) > 0,
  'summary excludes only synthetic /__ routes'
);

select ok(
  position('e.path !~ ''^/__''' in pg_get_functiondef('public.hb_web_analytics_top_paths(integer,integer)'::regprocedure)) > 0,
  'top-path aggregation excludes only synthetic /__ routes'
);

select ok(
  position('e.path !~ ''^/__''' in pg_get_functiondef('public.hb_web_analytics_sources(integer,integer)'::regprocedure)) > 0,
  'source aggregation excludes only synthetic /__ routes'
);

select ok(
  position('not like ''/__%''' in lower(pg_get_functiondef('public.hb_web_analytics_summary(integer)'::regprocedure))) = 0
  and position('not like ''/__%''' in lower(pg_get_functiondef('public.hb_web_analytics_top_paths(integer,integer)'::regprocedure))) = 0
  and position('not like ''/__%''' in lower(pg_get_functiondef('public.hb_web_analytics_sources(integer,integer)'::regprocedure))) = 0,
  'underscore wildcard regression cannot return in analytics RPCs'
);

select ok(
  not has_function_privilege('anon', 'public.hb_web_analytics_summary(integer)', 'EXECUTE'),
  'anonymous users cannot execute owner summary RPC'
);

select ok(
  has_function_privilege('authenticated', 'public.hb_web_analytics_summary(integer)', 'EXECUTE'),
  'authenticated role can call owner summary RPC subject to owner check'
);

select ok(
  exists(
    select 1
    from information_schema.columns
    where table_schema='public'
      and table_name='hb_web_analytics_events'
      and column_name='target_channel'
  ),
  'analytics stores an optional coarse contact channel'
);

select ok(
  position('e.path !~ ''^/__''' in pg_get_functiondef('public.hb_web_analytics_channels(integer,integer)'::regprocedure)) > 0,
  'channel aggregation excludes synthetic routes'
);

select ok(
  not has_function_privilege('anon', 'public.hb_web_analytics_channels(integer,integer)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.hb_web_analytics_channels(integer,integer)', 'EXECUTE'),
  'contact-channel analytics remain owner-gated through authenticated RPC'
);

select * from finish();
rollback;
