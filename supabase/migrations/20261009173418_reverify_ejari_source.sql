-- One service reviewed against its exact DLD card on 2026-10-09; no schema/auth/customer changes.
begin;
do $ejari_review$
declare
 s public.hb_policy_sources%rowtype;
 p public.hb_policy_versions%rowtype;
 w public.hb_workflow_templates%rowtype;
 new_rules jsonb := $rules$[{"id":"requirement:1","when":[],"effect":"review","reason":"نسخة العقد الموحد عبر التطبيق، وأصله عبر مركز أمين الخدمات.","actions":["collect_or_verify_requirement"],"sourceRefs":["https://dubailand.gov.ae/en/eservices/register-renew-ejari-contract/"]},{"id":"requirement:2","when":[],"effect":"review","reason":"إبراز هوية مقدم الطلب في المركز.","actions":["collect_or_verify_requirement"],"sourceRefs":["https://dubailand.gov.ae/en/eservices/register-renew-ejari-contract/"]},{"id":"requirement:3","when":[],"effect":"review","reason":"للممثل وكالة؛ يكفي رقم وكالة دبي، وترفق وكالة الإمارة الأخرى.","actions":["collect_or_verify_requirement"],"sourceRefs":["https://dubailand.gov.ae/en/eservices/register-renew-ejari-contract/"]},{"id":"conditions","when":[],"effect":"review","reason":"التطبيق للمالك والمستأجر كأفراد مع تحديث بيانات المالك. للمراكز يشترط ألا تدير العقار شركة أو مالك يستخدم إيجاري. راجع البطاقة لصلاحيات مستخدمي النظام.","actions":["review_conditions"],"sourceRefs":["https://dubailand.gov.ae/en/eservices/register-renew-ejari-contract/"]},{"id":"fees","when":[],"effect":"review","reason":"177.75 درهمًا عبر التطبيق أو الموقع، أو 220 درهمًا عبر مركز أمين الخدمات العقارية وفق الرسوم المنشورة.","actions":["review_fees"],"sourceRefs":["https://dubailand.gov.ae/en/eservices/register-renew-ejari-contract/"]},{"id":"duration","when":[],"effect":"review","reason":"25 دقيقة عبر مركز الخدمة، بخلاف الانتظار","actions":["review_duration"],"sourceRefs":["https://dubailand.gov.ae/en/eservices/register-renew-ejari-contract/"]}]$rules$::jsonb;
 new_steps jsonb;
 pv integer;
 wv integer;
 reviewed timestamptz := '2026-10-09T17:34:18Z';
begin
 select * into s from public.hb_policy_sources
 where authority_key='dld-rera' and source_url='https://dubailand.gov.ae/en/eservices/register-renew-ejari-contract/' and active for update;
 if not found then raise notice 'Exact Ejari source is absent in this catalog; no review state changed'; return; end if;
 if s.metadata->>'review_checkpoint'='ejari-official-card-2026-10-09' then return; end if;
 begin
 select v.* into strict p from public.hb_policy_versions v
 join public.hb_service_bindings b on b.policy_key=v.policy_key
 where b.service_slug='register-renew-ejari-contract-dubai' and b.active and v.status='active' for update of v;
 exception when no_data_found then raise notice 'Ejari policy is absent; no review state changed'; return; end;
 if not(s.id=any(p.source_ids)) then raise exception 'Ejari source binding mismatch'; end if;
 begin
 select v.* into strict w from public.hb_workflow_templates v
 join public.hb_service_bindings b on b.workflow_key=v.workflow_key
 where b.service_slug='register-renew-ejari-contract-dubai' and b.active and v.status='active' for update of v;
 exception when no_data_found then raise notice 'Ejari workflow is absent; no review state changed'; return; end;
 select coalesce(max(version),0)+1 into pv from public.hb_policy_versions where policy_key=p.policy_key and jurisdiction_id is not distinct from p.jurisdiction_id;
 select coalesce(max(version),0)+1 into wv from public.hb_workflow_templates where workflow_key=w.workflow_key and jurisdiction_id is not distinct from w.jurisdiction_id;
 select jsonb_agg(case
 when item->>'key'='requirement-1' then jsonb_set(item,'{title}',to_jsonb(new_rules->0->>'reason'))
 when item->>'key'='requirement-2' then jsonb_set(item,'{title}',to_jsonb(new_rules->1->>'reason'))
 when item->>'key'='requirement-3' then jsonb_set(item,'{title}',to_jsonb(new_rules->2->>'reason'))
 when item->>'key'='quality-review' then jsonb_set(item,'{metadata,conditions}',to_jsonb(new_rules->3->>'reason'))
 else item end order by ord) into new_steps
 from jsonb_array_elements(w.definition->'steps') with ordinality as steps(item,ord);
 -- Keep historical rule/step contents intact; new requests receive new active versions.
 update public.hb_policy_versions set status='retired',effective_until=reviewed where id=p.id;
 insert into public.hb_policy_versions(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at,country_pack_id)
 values(p.policy_key,p.jurisdiction_id,pv,reviewed,'active',new_rules,p.source_ids,'official-card-review-2026-10-09',reviewed,p.country_pack_id);
 update public.hb_workflow_templates set status='retired',effective_until=reviewed where id=w.id;
 insert into public.hb_workflow_templates(workflow_key,jurisdiction_id,service_slug,version,status,definition,effective_from,country_pack_id)
 values(w.workflow_key,w.jurisdiction_id,w.service_slug,wv,'active',jsonb_set(jsonb_set(w.definition,'{steps}',new_steps),'{version}',to_jsonb(wv)),reviewed,w.country_pack_id);
 -- Clear the pending flag only after the actual field review above; source monitoring remains enabled.
 update public.hb_policy_sources set last_verified_at=reviewed,last_checked_at=reviewed,last_http_status=200,monitor_failures=0,monitor_error=null,review_required=false,
 metadata=metadata||jsonb_build_object('review_checkpoint','ejari-official-card-2026-10-09','reverified_at',reviewed,'verification_state','OFFICIAL_LINK_AND_DETAILS_VERIFIED','verification_scope','documents_conditions_fees_duration','review_source','https://dubailand.gov.ae/en/eservices/register-renew-ejari-contract/')
 where id=s.id;
end $ejari_review$;
commit;
