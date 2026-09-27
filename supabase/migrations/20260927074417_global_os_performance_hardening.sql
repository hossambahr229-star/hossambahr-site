-- Optimize Global OS RLS evaluation and cover every public hb_* foreign key.

do $$
declare
  r record;
  v_sql text;
  v_qual text;
  v_check text;
begin
  for r in
    select tablename, policyname, qual, with_check
    from pg_policies
    where schemaname='public'
      and tablename like 'hb\_%' escape '\'
      and (
        (qual is not null and qual like '%auth.uid()%')
        or (with_check is not null and with_check like '%auth.uid()%')
      )
  loop
    v_qual := case when r.qual is null then null else replace(r.qual,'auth.uid()','(select auth.uid())') end;
    v_check := case when r.with_check is null then null else replace(r.with_check,'auth.uid()','(select auth.uid())') end;
    v_sql := format('alter policy %I on public.%I',r.policyname,r.tablename);
    if v_qual is not null then v_sql := v_sql || format(' using (%s)',v_qual); end if;
    if v_check is not null then v_sql := v_sql || format(' with check (%s)',v_check); end if;
    execute v_sql;
  end loop;
end;
$$;

do $$
declare
  r record;
  v_cols text;
  v_index_name text;
begin
  for r in
    select c.conname,c.conrelid,c.conrelid::regclass as table_regclass,cls.relname,c.conkey
    from pg_constraint c
    join pg_class cls on cls.oid=c.conrelid
    join pg_namespace n on n.oid=cls.relnamespace
    where c.contype='f'
      and n.nspname='public'
      and cls.relname like 'hb\_%' escape '\'
      and not exists (
        select 1 from pg_index i
        where i.indrelid=c.conrelid
          and i.indisvalid
          and i.indisready
          and (i.indkey::smallint[])[0:cardinality(c.conkey)-1]=c.conkey
      )
  loop
    select string_agg(quote_ident(a.attname),', ' order by u.ord)
      into v_cols
    from unnest(r.conkey) with ordinality u(attnum,ord)
    join pg_attribute a on a.attrelid=r.conrelid and a.attnum=u.attnum;

    v_index_name := left('idx_'||r.relname||'_'||substr(md5(r.conname),1,8)||'_fk',63);
    execute format('create index if not exists %I on %s (%s)',v_index_name,r.table_regclass,v_cols);
  end loop;
end;
$$;
