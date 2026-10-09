-- One service reviewed against its exact Fujairah Municipality card on 2026-10-09; no schema/auth/customer changes.
begin;
do $ejari_review$
declare
 s public.hb_policy_sources%rowtype;
 p public.hb_policy_versions%rowtype;
 w public.hb_workflow_templates%rowtype;
 new_rules jsonb := $rules$[{"id":"requirement:1","when":[],"effect":"review","reason":"اعتماد اسم تجاري ساري واستمارة ترخيص مكتملة وموقعة.","actions":["collect_or_verify_requirement"],"sourceRefs":["https://portal.fujmun.gov.ae/OnlineEservices/en/eService/ServicePages/service_information.aspx?serviceid=157"]},{"id":"requirement:2","when":[],"effect":"review","reason":"هوية وجواز مالك الرخصة؛ وتطلب البطاقة للأجانب جوازَي وكيل الخدمات والمدير ساريين.","actions":["collect_or_verify_requirement"],"sourceRefs":["https://portal.fujmun.gov.ae/OnlineEservices/en/eService/ServicePages/service_information.aspx?serviceid=157"]},{"id":"requirement:3","when":[],"effect":"review","reason":"نسخة عقد إيجار ساري مع الأصل، أو ملكية العقار أو مخطط الأرض إذا كان الموقع باسم صاحب الرخصة.","actions":["collect_or_verify_requirement"],"sourceRefs":["https://portal.fujmun.gov.ae/OnlineEservices/en/eService/ServicePages/service_information.aspx?serviceid=157"]},{"id":"requirement:4","when":[],"effect":"review","reason":"عقد وكيل خدمات محلي مصدق في الحالات المسموح بها، وكتاب عدم ممانعة من الإقامة للأجانب بحسب البطاقة.","actions":["collect_or_verify_requirement"],"sourceRefs":["https://portal.fujmun.gov.ae/OnlineEservices/en/eService/ServicePages/service_information.aspx?serviceid=157"]},{"id":"requirement:5","when":[],"effect":"review","reason":"موافقات الجهات المختصة للنشاط؛ وموافقة التخطيط لإيجار فيلا واعتماد توقيع صاحب الرخصة عند عدم حضوره.","actions":["collect_or_verify_requirement"],"sourceRefs":["https://portal.fujmun.gov.ae/OnlineEservices/en/eService/ServicePages/service_information.aspx?serviceid=157"]},{"id":"conditions","when":[],"effect":"review","reason":"تطبق شروط العمر أو الإذن القضائي، وشروط الوكيل للجنسية المعنية، والموقع والنشاط وفق بطاقة البلدية؛ تحقق من انطباق الحالة قبل التقديم.","actions":["review_conditions"],"sourceRefs":["https://portal.fujmun.gov.ae/OnlineEservices/en/eService/ServicePages/service_information.aspx?serviceid=157"]},{"id":"fees","when":[],"effect":"review","reason":"الرسوم تعتمد على النشاط وطبيعة الترخيص؛ ظهور صفر بجوار تصنيف الرسوم في البطاقة لا يعني أن إصدار الرخصة مجاني.","actions":["review_fees"],"sourceRefs":["https://portal.fujmun.gov.ae/OnlineEservices/en/eService/ServicePages/service_information.aspx?serviceid=157"]},{"id":"duration","when":[],"effect":"review","reason":"تعرض البطاقة متوسط الإنجاز الحالي؛ ليس مدة مضمونة للطلب، وتتوقف الحالة على اكتمال المستندات والموافقات.","actions":["review_duration"],"sourceRefs":["https://portal.fujmun.gov.ae/OnlineEservices/en/eService/ServicePages/service_information.aspx?serviceid=157"]}]$rules$::jsonb;
 new_steps jsonb;
 pv integer;
 wv integer;
 reviewed timestamptz := '2026-10-09T17:48:49Z';
begin
 select * into s from public.hb_policy_sources
 where authority_key='fujairah-business' and source_url='https://portal.fujmun.gov.ae/OnlineEservices/en/eService/ServicePages/service_information.aspx?serviceid=157' and active for update;
 if not found then raise notice 'Exact Fujairah issuance source is absent in this catalog; no review state changed'; return; end if;
 if s.metadata->>'review_checkpoint'='fujairah-issuance-official-card-2026-10-09' then return; end if;
 begin
 select v.* into strict p from public.hb_policy_versions v
 join public.hb_service_bindings b on b.policy_key=v.policy_key
 where b.service_slug='fujairah-economic-license-issuance' and b.active and v.status='active' for update of v;
 exception when no_data_found then raise notice 'Fujairah issuance policy is absent; no review state changed'; return; end;
 if not(s.id=any(p.source_ids)) then raise exception 'Fujairah issuance source binding mismatch'; end if;
 begin
 select v.* into strict w from public.hb_workflow_templates v
 join public.hb_service_bindings b on b.workflow_key=v.workflow_key
 where b.service_slug='fujairah-economic-license-issuance' and b.active and v.status='active' for update of v;
 exception when no_data_found then raise notice 'Fujairah issuance workflow is absent; no review state changed'; return; end;
 select coalesce(max(version),0)+1 into pv from public.hb_policy_versions where policy_key=p.policy_key and jurisdiction_id is not distinct from p.jurisdiction_id;
 select coalesce(max(version),0)+1 into wv from public.hb_workflow_templates where workflow_key=w.workflow_key and jurisdiction_id is not distinct from w.jurisdiction_id;
 select jsonb_agg(case
 when item->>'key' like 'requirement-%' then jsonb_set(item,'{title}',to_jsonb(new_rules->(split_part(item->>'key','-',2)::integer-1)->>'reason'))
 when item->>'key'='quality-review' then jsonb_set(item,'{metadata,conditions}',to_jsonb(new_rules->5->>'reason'))
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
 metadata=metadata||jsonb_build_object('review_checkpoint','fujairah-issuance-official-card-2026-10-09','reverified_at',reviewed,'verification_state','OFFICIAL_LINK_AND_DETAILS_VERIFIED','verification_scope','documents_conditions_fees_duration','review_source','https://portal.fujmun.gov.ae/OnlineEservices/en/eService/ServicePages/service_information.aspx?serviceid=157')
 where id=s.id;
end $ejari_review$;
commit;
