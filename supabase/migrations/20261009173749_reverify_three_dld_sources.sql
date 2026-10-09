-- Three exact DLD service cards manually reviewed on 2026-10-09; retain historical versions and monitoring.
begin;
do $ejari_review$
declare
 s public.hb_policy_sources%rowtype;
 p public.hb_policy_versions%rowtype;
 w public.hb_workflow_templates%rowtype;
 new_rules jsonb := $rules$[{"id":"requirement:1","when":[],"effect":"review","reason":"نموذج طلب التقييم.","actions":["collect_or_verify_requirement"],"sourceRefs":["https://dubailand.gov.ae/en/eservices/property-valuation"]},{"id":"requirement:2","when":[],"effect":"review","reason":"خطاب المالك وهوية إماراتية أو جواز ساري.","actions":["collect_or_verify_requirement"],"sourceRefs":["https://dubailand.gov.ae/en/eservices/property-valuation"]},{"id":"requirement:3","when":[],"effect":"review","reason":"خريطة بلدية سارية لسنة أو خريطة تخطيط.","actions":["collect_or_verify_requirement"],"sourceRefs":["https://dubailand.gov.ae/en/eservices/property-valuation"]},{"id":"requirement:4","when":[],"effect":"review","reason":"صور حديثة للعقار.","actions":["collect_or_verify_requirement"],"sourceRefs":["https://dubailand.gov.ae/en/eservices/property-valuation"]},{"id":"requirement:5","when":[],"effect":"review","reason":"مستندات إضافية بحسب نوع العقار، ومنها المساحات والعقود والبيانات المالية عند انطباقها.","actions":["collect_or_verify_requirement"],"sourceRefs":["https://dubailand.gov.ae/en/eservices/property-valuation"]},{"id":"conditions","when":[],"effect":"review","reason":"اختر نوع العقار والغرض؛ تختلف المستندات الإضافية والرسوم بحسب الفئة.","actions":["review_conditions"],"sourceRefs":["https://dubailand.gov.ae/en/eservices/property-valuation"]},{"id":"fees","when":[],"effect":"review","reason":"تتراوح الرسوم الأساسية المنشورة من 2,000 إلى 15,000 درهم بحسب نوع التقييم، مع رسوم المعرفة والابتكار والشريك عند انطباقها؛ ليست سعرًا موحدًا.","actions":["review_fees"],"sourceRefs":["https://dubailand.gov.ae/en/eservices/property-valuation"]},{"id":"duration","when":[],"effect":"review","reason":"فوري للوحدات السكنية والفلل الملحقة؛ 7 أيام عمل للأنواع الأخرى.","actions":["review_duration"],"sourceRefs":["https://dubailand.gov.ae/en/eservices/property-valuation"]}]$rules$::jsonb;
 new_steps jsonb;
 pv integer;
 wv integer;
 reviewed timestamptz := '2026-10-09T17:37:49Z';
begin
 select * into s from public.hb_policy_sources
 where authority_key='dld-rera' and source_url='https://dubailand.gov.ae/en/eservices/property-valuation' and active for update;
 if not found then raise notice 'Exact Ejari source is absent in this catalog; no review state changed'; return; end if;
 if s.metadata->>'review_checkpoint'='property-valuation-dubai-official-card-2026-10-09' then return; end if;
 begin
 select v.* into strict p from public.hb_policy_versions v
 join public.hb_service_bindings b on b.policy_key=v.policy_key
 where b.service_slug='property-valuation-dubai' and b.active and v.status='active' for update of v;
 exception when no_data_found then raise notice 'Ejari policy is absent; no review state changed'; return; end;
 if not(s.id=any(p.source_ids)) then raise exception 'Ejari source binding mismatch'; end if;
 begin
 select v.* into strict w from public.hb_workflow_templates v
 join public.hb_service_bindings b on b.workflow_key=v.workflow_key
 where b.service_slug='property-valuation-dubai' and b.active and v.status='active' for update of v;
 exception when no_data_found then raise notice 'Ejari workflow is absent; no review state changed'; return; end;
 select coalesce(max(version),0)+1 into pv from public.hb_policy_versions where policy_key=p.policy_key and jurisdiction_id is not distinct from p.jurisdiction_id;
 select coalesce(max(version),0)+1 into wv from public.hb_workflow_templates where workflow_key=w.workflow_key and jurisdiction_id is not distinct from w.jurisdiction_id;
 select jsonb_agg(case
 when item->>'taskType'='requirement' then jsonb_set(item,'{title}',coalesce((select to_jsonb(r->>'reason') from jsonb_array_elements(new_rules) r where r->>'id'='requirement:'||split_part(item->>'key','-',2)),item->'title'))
 when item->>'key'='quality-review' then jsonb_set(item,'{metadata,conditions}',(select to_jsonb(r->>'reason') from jsonb_array_elements(new_rules) r where r->>'id'='conditions'))
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
 metadata=metadata||jsonb_build_object('review_checkpoint','property-valuation-dubai-official-card-2026-10-09','reverified_at',reviewed,'verification_state','OFFICIAL_LINK_AND_DETAILS_VERIFIED','verification_scope','documents_conditions_fees_duration','review_source','https://dubailand.gov.ae/en/eservices/property-valuation')
 where id=s.id;
end $ejari_review$;

do $ejari_review$
declare
 s public.hb_policy_sources%rowtype;
 p public.hb_policy_versions%rowtype;
 w public.hb_workflow_templates%rowtype;
 new_rules jsonb := $rules$[{"id":"requirement:1","when":[],"effect":"review","reason":"صورة شخصية.","actions":["collect_or_verify_requirement"],"sourceRefs":["https://dubailand.gov.ae/en/eservices/request-for-issuing-a-real-estate-activity-practice-card/"]},{"id":"requirement:2","when":[],"effect":"review","reason":"نسخة الهوية الإماراتية.","actions":["collect_or_verify_requirement"],"sourceRefs":["https://dubailand.gov.ae/en/eservices/request-for-issuing-a-real-estate-activity-practice-card/"]},{"id":"requirement:3","when":[],"effect":"review","reason":"لبطاقة مُقيّم العقارات: شهادة خبرة سنتين للمواطن وخمس سنوات للوافد.","actions":["collect_or_verify_requirement"],"sourceRefs":["https://dubailand.gov.ae/en/eservices/request-for-issuing-a-real-estate-activity-practice-card/"]},{"id":"conditions","when":[],"effect":"review","reason":"حسن سيرة من شرطة دبي واختبار الوساطة السنوي مع الاستثناءات الرسمية. صلاحية البطاقة مرتبطة بالرخصة؛ توجد شروط إضافية للمُقيّم والمتدرب في البطاقة.","actions":["review_conditions"],"sourceRefs":["https://dubailand.gov.ae/en/eservices/request-for-issuing-a-real-estate-activity-practice-card/"]},{"id":"fees","when":[],"effect":"review","reason":"500 درهم لمعظم البطاقات و5,000 لبطاقة مُقيّم العقارات. رسوم الاختبار والمعرفة والابتكار وERES تضاف بحسب الفئة؛ تحقق من الإجمالي الرسمي.","actions":["review_fees"],"sourceRefs":["https://dubailand.gov.ae/en/eservices/request-for-issuing-a-real-estate-activity-practice-card/"]},{"id":"duration","when":[],"effect":"review","reason":"5 دقائق وفق بطاقة الجهة.","actions":["review_duration"],"sourceRefs":["https://dubailand.gov.ae/en/eservices/request-for-issuing-a-real-estate-activity-practice-card/"]}]$rules$::jsonb;
 new_steps jsonb;
 pv integer;
 wv integer;
 reviewed timestamptz := '2026-10-09T17:37:49Z';
begin
 select * into s from public.hb_policy_sources
 where authority_key='dld-rera' and source_url='https://dubailand.gov.ae/en/eservices/request-for-issuing-a-real-estate-activity-practice-card/' and active for update;
 if not found then raise notice 'Exact Ejari source is absent in this catalog; no review state changed'; return; end if;
 if s.metadata->>'review_checkpoint'='real-estate-professional-practice-card-dubai-official-card-2026-10-09' then return; end if;
 begin
 select v.* into strict p from public.hb_policy_versions v
 join public.hb_service_bindings b on b.policy_key=v.policy_key
 where b.service_slug='real-estate-professional-practice-card-dubai' and b.active and v.status='active' for update of v;
 exception when no_data_found then raise notice 'Ejari policy is absent; no review state changed'; return; end;
 if not(s.id=any(p.source_ids)) then raise exception 'Ejari source binding mismatch'; end if;
 begin
 select v.* into strict w from public.hb_workflow_templates v
 join public.hb_service_bindings b on b.workflow_key=v.workflow_key
 where b.service_slug='real-estate-professional-practice-card-dubai' and b.active and v.status='active' for update of v;
 exception when no_data_found then raise notice 'Ejari workflow is absent; no review state changed'; return; end;
 select coalesce(max(version),0)+1 into pv from public.hb_policy_versions where policy_key=p.policy_key and jurisdiction_id is not distinct from p.jurisdiction_id;
 select coalesce(max(version),0)+1 into wv from public.hb_workflow_templates where workflow_key=w.workflow_key and jurisdiction_id is not distinct from w.jurisdiction_id;
 select jsonb_agg(case
 when item->>'taskType'='requirement' then jsonb_set(item,'{title}',coalesce((select to_jsonb(r->>'reason') from jsonb_array_elements(new_rules) r where r->>'id'='requirement:'||split_part(item->>'key','-',2)),item->'title'))
 when item->>'key'='quality-review' then jsonb_set(item,'{metadata,conditions}',(select to_jsonb(r->>'reason') from jsonb_array_elements(new_rules) r where r->>'id'='conditions'))
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
 metadata=metadata||jsonb_build_object('review_checkpoint','real-estate-professional-practice-card-dubai-official-card-2026-10-09','reverified_at',reviewed,'verification_state','OFFICIAL_LINK_AND_DETAILS_VERIFIED','verification_scope','documents_conditions_fees_duration','review_source','https://dubailand.gov.ae/en/eservices/request-for-issuing-a-real-estate-activity-practice-card/')
 where id=s.id;
end $ejari_review$;

do $ejari_review$
declare
 s public.hb_policy_sources%rowtype;
 p public.hb_policy_versions%rowtype;
 w public.hb_workflow_templates%rowtype;
 new_rules jsonb := $rules$[{"id":"requirement:1","when":[],"effect":"review","reason":"خطاب من المحيل شخصًا أو جهة.","actions":["collect_or_verify_requirement"],"sourceRefs":["https://backoffice.dubailand.gov.ae/en/eservices/request-for-transfer-of-ownership/"]},{"id":"requirement:2","when":[],"effect":"review","reason":"هوية المالك أو وكالة رسمية عند غيابه.","actions":["collect_or_verify_requirement"],"sourceRefs":["https://backoffice.dubailand.gov.ae/en/eservices/request-for-transfer-of-ownership/"]},{"id":"requirement:3","when":[],"effect":"review","reason":"جوازات سارية للمالكين غير المقيمين.","actions":["collect_or_verify_requirement"],"sourceRefs":["https://backoffice.dubailand.gov.ae/en/eservices/request-for-transfer-of-ownership/"]},{"id":"requirement:4","when":[],"effect":"review","reason":"رخصة تجارية للشركات.","actions":["collect_or_verify_requirement"],"sourceRefs":["https://backoffice.dubailand.gov.ae/en/eservices/request-for-transfer-of-ownership/"]},{"id":"conditions","when":[],"effect":"review","reason":"انتقال سند الملكية وفق الخطابات الرسمية الحكومية، عبر المقر الرئيسي للدائرة والتدقيق والاعتماد.","actions":["review_conditions"],"sourceRefs":["https://backoffice.dubailand.gov.ae/en/eservices/request-for-transfer-of-ownership/"]},{"id":"fees","when":[],"effect":"review","reason":"250 درهمًا لكل سند؛ الخرائط 100 أو225 للأرض، و250 للشقة أو الفيلا بحسب الفئة، مع 10 دراهم معرفة و10 ابتكار لكل رسم.","actions":["review_fees"],"sourceRefs":["https://backoffice.dubailand.gov.ae/en/eservices/request-for-transfer-of-ownership/"]},{"id":"duration","when":[],"effect":"review","reason":"25 دقيقة وفق بطاقة الجهة.","actions":["review_duration"],"sourceRefs":["https://backoffice.dubailand.gov.ae/en/eservices/request-for-transfer-of-ownership/"]}]$rules$::jsonb;
 new_steps jsonb;
 pv integer;
 wv integer;
 reviewed timestamptz := '2026-10-09T17:37:49Z';
begin
 select * into s from public.hb_policy_sources
 where authority_key='dld-rera' and source_url='https://backoffice.dubailand.gov.ae/en/eservices/request-for-transfer-of-ownership/' and active for update;
 if not found then raise notice 'Exact Ejari source is absent in this catalog; no review state changed'; return; end if;
 if s.metadata->>'review_checkpoint'='title-transfer-dubai-official-card-2026-10-09' then return; end if;
 begin
 select v.* into strict p from public.hb_policy_versions v
 join public.hb_service_bindings b on b.policy_key=v.policy_key
 where b.service_slug='title-transfer-dubai' and b.active and v.status='active' for update of v;
 exception when no_data_found then raise notice 'Ejari policy is absent; no review state changed'; return; end;
 if not(s.id=any(p.source_ids)) then raise exception 'Ejari source binding mismatch'; end if;
 begin
 select v.* into strict w from public.hb_workflow_templates v
 join public.hb_service_bindings b on b.workflow_key=v.workflow_key
 where b.service_slug='title-transfer-dubai' and b.active and v.status='active' for update of v;
 exception when no_data_found then raise notice 'Ejari workflow is absent; no review state changed'; return; end;
 select coalesce(max(version),0)+1 into pv from public.hb_policy_versions where policy_key=p.policy_key and jurisdiction_id is not distinct from p.jurisdiction_id;
 select coalesce(max(version),0)+1 into wv from public.hb_workflow_templates where workflow_key=w.workflow_key and jurisdiction_id is not distinct from w.jurisdiction_id;
 select jsonb_agg(case
 when item->>'taskType'='requirement' then jsonb_set(item,'{title}',coalesce((select to_jsonb(r->>'reason') from jsonb_array_elements(new_rules) r where r->>'id'='requirement:'||split_part(item->>'key','-',2)),item->'title'))
 when item->>'key'='quality-review' then jsonb_set(item,'{metadata,conditions}',(select to_jsonb(r->>'reason') from jsonb_array_elements(new_rules) r where r->>'id'='conditions'))
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
 metadata=metadata||jsonb_build_object('review_checkpoint','title-transfer-dubai-official-card-2026-10-09','reverified_at',reviewed,'verification_state','OFFICIAL_LINK_AND_DETAILS_VERIFIED','verification_scope','documents_conditions_fees_duration','review_source','https://backoffice.dubailand.gov.ae/en/eservices/request-for-transfer-of-ownership/')
 where id=s.id;
end $ejari_review$;

commit;
