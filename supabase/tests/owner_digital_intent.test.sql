begin;

select plan(6);

select ok(
  to_regprocedure('public.hb_owner_digital_intent_snapshot(integer)') is not null,
  'public Digital Intent RPC exists'
);

select ok(
  to_regprocedure('hb_private.owner_digital_intent_snapshot(integer)') is not null,
  'private Digital Intent implementation exists'
);

select ok(
  not has_function_privilege('anon','public.hb_owner_digital_intent_snapshot(integer)','EXECUTE'),
  'anonymous users cannot execute Digital Intent RPC'
);

select ok(
  has_function_privilege('authenticated','public.hb_owner_digital_intent_snapshot(integer)','EXECUTE'),
  'authenticated role can call Digital Intent RPC subject to owner check'
);

select ok(
  position('distinct on (e.session_token)' in lower(pg_get_functiondef('hb_private.owner_digital_intent_snapshot(integer)'::regprocedure))) > 0,
  'Digital Intent sources use first-touch session attribution'
);

select ok(
  position('hossambahr.com' in lower(pg_get_functiondef('hb_private.owner_digital_intent_snapshot(integer)'::regprocedure))) > 0,
  'Digital Intent normalizes internal HossamBahr referrers'
);

select * from finish();
rollback;
