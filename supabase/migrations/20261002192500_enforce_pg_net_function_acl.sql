-- Extension-owned pg_net functions retain PUBLIC execute after blanket schema revokes.
-- Revoke each existing function signature explicitly; the internal postgres-owned SECURITY DEFINER caller remains functional.
do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure::text as signature
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='net' and p.prokind='f'
  loop
    execute format('revoke execute on function %s from public, anon, authenticated',r.signature);
  end loop;
end $$;
