begin;
select plan(5);
select is((select count(*)::integer from public.hb_policy_versions where reviewed_by='partial-official-fields-2026-10-15' and version=2 and status='active'),11,'Eleven reviewed policy versions are active');
select is((select count(*)::integer from public.hb_service_bindings where metadata->>'recorded_detail_review'='partial-official-fields-2026-10-15' and (metadata->>'source_scope_unresolved')::boolean),4,'Four partially scoped services retain unresolved eligibility');
select is((select count(*)::integer from public.hb_policy_versions p cross join lateral jsonb_array_elements(p.rules) r where p.reviewed_by='partial-official-fields-2026-10-15' and p.status='active' and r->>'id'='conditions' and r->>'reason'='غير موثق بعد'),4,'Unknown eligibility is not silently made verified');
select is((select count(*)::integer from public.hb_policy_versions p cross join lateral jsonb_array_elements(p.rules) r where p.reviewed_by='partial-official-fields-2026-10-15' and p.status='active' and r->>'id'='official-steps'),7,'Seven source-reviewed official procedures are available');
select ok(not exists(select 1 from public.hb_service_bindings b join public.hb_workflow_templates w on w.workflow_key=b.workflow_key and w.status='active' cross join lateral jsonb_array_elements(w.definition->'steps') s where b.metadata->>'recorded_detail_review'='partial-official-fields-2026-10-15' and s->>'taskType'='external' and coalesce((s->>'requiresApproval')::boolean,false)=false),'External execution still requires approval');
select * from finish();rollback;
