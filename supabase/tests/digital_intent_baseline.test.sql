begin;

select plan(3);

select ok(
  position('2026-09-28 18:56:27+00' in pg_get_functiondef('hb_private.owner_digital_intent_snapshot(integer)'::regprocedure)) > 0
  or position('2026-09-28T18:56:27Z' in pg_get_functiondef('hb_private.owner_digital_intent_snapshot(integer)'::regprocedure)) > 0,
  'Digital Intent function pins the first QA-clean production baseline'
);

select ok(
  position('greatest(now() - make_interval' in lower(pg_get_functiondef('hb_private.owner_digital_intent_snapshot(integer)'::regprocedure))) > 0,
  'Digital Intent uses the later of rolling window and clean baseline'
);

select ok(
  position('clean_baseline_at' in pg_get_functiondef('hb_private.owner_digital_intent_snapshot(integer)'::regprocedure)) > 0,
  'Digital Intent exposes baseline metadata to the owner dashboard'
);

select * from finish();
rollback;
