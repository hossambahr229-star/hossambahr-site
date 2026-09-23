begin;
select plan(1);
select set_config('hb.probe_owner',gen_random_uuid()::text,true), set_config('hb.probe_other',gen_random_uuid()::text,true);
insert into auth.users(id,aud,role,email) values
(current_setting('hb.probe_owner')::uuid,'authenticated','authenticated',current_setting('hb.probe_owner')||'@example.invalid'),
(current_setting('hb.probe_other')::uuid,'authenticated','authenticated',current_setting('hb.probe_other')||'@example.invalid');
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('hb.probe_owner'),true),
set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('hb.probe_owner'),'role','authenticated')::text,true);
with o as (insert into public.hb_organizations(owner_user_id,legal_name) values(auth.uid(),'ROLLBACK ONLY - RLS probe') returning id)
select set_config('hb.probe_org',(select id::text from o),true);
with c as (insert into public.hb_cases(user_id,organization_id,title,goal,status) values(auth.uid(),current_setting('hb.probe_org')::uuid,'ROLLBACK ONLY','Verify isolation','qualifying') returning id)
select set_config('hb.probe_case',(select id::text from c),true);
do $$
begin
if not exists(select 1 from public.hb_cases where id=current_setting('hb.probe_case')::uuid) then raise exception 'FAIL owner cannot read case'; end if;
if not public.hb_has_org_role(current_setting('hb.probe_org')::uuid,array['owner']) then raise exception 'FAIL owner membership'; end if;
if has_table_privilege('authenticated','public.hb_cases','UPDATE') then raise exception 'FAIL case lifecycle writable'; end if;
if has_table_privilege('authenticated','public.hb_outbox_events','INSERT') then raise exception 'FAIL outbox writable'; end if;
end $$;
select set_config('request.jwt.claim.sub',current_setting('hb.probe_other'),true),
set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('hb.probe_other'),'role','authenticated')::text,true);
do $$
begin
if exists(select 1 from public.hb_cases where id=current_setting('hb.probe_case')::uuid) then raise exception 'FAIL cross-user case disclosure'; end if;
if exists(select 1 from public.hb_organizations where id=current_setting('hb.probe_org')::uuid) then raise exception 'FAIL cross-user organization disclosure'; end if;
if public.hb_is_org_member(current_setting('hb.probe_org')::uuid) then raise exception 'FAIL false organization membership'; end if;
begin
insert into public.hb_cases(user_id,organization_id,title) values(auth.uid(),current_setting('hb.probe_org')::uuid,'MUST BE DENIED');
raise exception 'FAIL unauthorized organization insert';
exception when insufficient_privilege then null;
end;
begin
perform public.hb_register_document('test',current_setting('hb.probe_owner')||'/probe.pdf','probe.pdf',1,'application/pdf',null,null,null);
raise exception 'FAIL foreign vault registration';
exception when raise_exception then
if sqlerrm <> 'storage path is outside user vault' then raise; end if;
end;
end $$;
reset role;
select pass('Nine owner, cross-user, role and vault isolation checks pass');
select * from finish();
rollback;

