begin;

select plan(6);

select ok(
  to_regprocedure('public.hb_owner_digital_campaigns(integer)') is not null,
  'public Digital Campaign RPC exists'
);

select ok(
  to_regprocedure('hb_private.owner_digital_campaigns(integer)') is not null,
  'private Digital Campaign implementation exists'
);

select ok(
  not has_function_privilege('anon','public.hb_owner_digital_campaigns(integer)','EXECUTE'),
  'anonymous users cannot execute Digital Campaign RPC'
);

select ok(
  has_function_privilege('authenticated','public.hb_owner_digital_campaigns(integer)','EXECUTE'),
  'authenticated role can call Digital Campaign RPC subject to owner check'
);

select ok(
  position('utm_campaign' in lower(pg_get_functiondef('hb_private.owner_digital_campaigns(integer)'::regprocedure))) > 0,
  'campaign attribution is based on UTM campaign values'
);

select ok(
  position('distinct on (e.session_token)' in lower(pg_get_functiondef('hb_private.owner_digital_campaigns(integer)'::regprocedure))) > 0,
  'campaign attribution uses first-touch session assignment'
);

select * from finish();
rollback;
