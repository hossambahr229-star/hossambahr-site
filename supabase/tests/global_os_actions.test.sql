begin;

select plan(4);

select ok(
  to_regprocedure('public.hb_submit_user_task(uuid,text)') is not null,
  'user task submission RPC exists'
);

select ok(
  to_regprocedure('public.hb_decide_task_approval(uuid,text,text)') is not null,
  'task approval decision RPC exists'
);

select ok(
  has_function_privilege('authenticated','public.hb_submit_user_task(uuid,text)','EXECUTE'),
  'authenticated users can call task submission RPC'
);

select ok(
  has_function_privilege('authenticated','public.hb_decide_task_approval(uuid,text,text)','EXECUTE'),
  'authenticated users can call approval RPC'
);

select * from finish();
rollback;
