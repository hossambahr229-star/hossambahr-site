-- pg_net extension updates can restore PUBLIC EXECUTE on extension-owned functions.
-- Enforce the production invariant after all extension setup/migrations.
do $$
declare r record;
begin
  revoke usage on schema net from public, anon, authenticated;
  for r in
    select p.oid::regprocedure::text as signature
    from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='net' and p.prokind='f'
  loop
    execute format('revoke execute on function %s from public, anon, authenticated',r.signature);
  end loop;

  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='net'
      and p.prokind='f'
      and (
        has_function_privilege('anon',p.oid,'EXECUTE')
        or has_function_privilege('authenticated',p.oid,'EXECUTE')
      )
  ) then
    raise exception 'pg_net ACL invariant failed: client roles retain EXECUTE';
  end if;
end $$;
