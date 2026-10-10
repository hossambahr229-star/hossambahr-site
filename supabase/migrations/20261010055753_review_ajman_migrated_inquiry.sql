begin;
do $ajman_review$
declare
 reviewed timestamptz := '2026-10-10T05:57:53Z';
 s public.hb_policy_sources%rowtype;
 p public.hb_policy_versions%rowtype;
 w public.hb_workflow_templates%rowtype;
 nav_id uuid; pv integer; wv integer; new_steps jsonb;
 reviewed_rules jsonb := $ajman_rules$[{"id":"requirement:1","when":[],"effect":"review","reason":"لا تتطلب بطاقة الخدمة DED03.005 مستندات","actions":["confirm_no_documents_required"],"sourceRefs":["https://www.ajmanded.ae/en/services/services-directory/inquiry-services/business-activity-inquiry"]},{"id":"conditions","when":[],"effect":"review","reason":"الخدمة للاستعلام عن أنشطة الرخصة الاقتصادية. تعرض الأداة الحالية إجراء إصدار رخصة؛ ويظهر التجديد والتعديل قيد التطوير. لا ترسل هذه الصفحة طلب إصدار رخصة.","actions":["review_conditions"],"sourceRefs":["https://www.ajmanded.ae/en/services/services-directory/inquiry-services/business-activity-inquiry","https://ajded.gov.ae/eservice/inquiries/activities-inquiry?lang=ar"]},{"id":"fees","when":[],"effect":"review","reason":"الاستعلام مجاني وفق بطاقة DED03.005؛ لا يشمل ذلك رسوم إصدار أو تعديل الرخصة.","actions":["review_fees"],"sourceRefs":["https://www.ajmanded.ae/en/services/services-directory/inquiry-services/business-activity-inquiry"]},{"id":"duration","when":[],"effect":"review","reason":"دقيقتان للاستعلام وفق بطاقة DED03.005؛ ليست مدة إصدار أو تعديل رخصة.","actions":["review_duration"],"sourceRefs":["https://www.ajmanded.ae/en/services/services-directory/inquiry-services/business-activity-inquiry"]}]$ajman_rules$::jsonb;
begin
 begin
  select * into strict s from public.hb_policy_sources where id='0142847c-b180-49b2-b659-e72513bad60f'::uuid and authority_key='ajman-ded' and source_url in ('https://eservices.ajmanded.ae/en/activitiesapprovalsinquiry','https://www.ajmanded.ae/en/services/services-directory/inquiry-services/business-activity-inquiry') for update;
 exception when no_data_found then raise notice 'Ajman source absent on a clean database'; return; end;
 begin
  select v.* into strict p from public.hb_policy_versions v join public.hb_service_bindings b on b.policy_key=v.policy_key
   where b.service_slug='ajman-business-activity-inquiry' and b.active and v.status='active' for update of v;
 exception when no_data_found then raise notice 'Ajman policy absent on a clean database'; return; end;
 if exists(select 1 from public.hb_policy_versions where policy_key=p.policy_key and reviewed_by='official-ajman-inquiry-review-2026-10-10' and rules=reviewed_rules) then return; end if;
 if not(s.id=any(p.source_ids)) then raise exception 'Ajman source binding mismatch'; end if;
 select v.* into strict w from public.hb_workflow_templates v join public.hb_service_bindings b on b.workflow_key=v.workflow_key
  where b.service_slug='ajman-business-activity-inquiry' and b.active and v.status='active' for update of v;
 select id into nav_id from public.hb_policy_sources where authority_key='ajman-ded' and source_url='https://ajded.gov.ae/eservice/inquiries/activities-inquiry?lang=ar' and active limit 1;
 if nav_id is null then
  insert into public.hb_policy_sources(country_pack_id,jurisdiction_id,authority_id,authority_key,source_type,title,source_url,last_verified_at,last_checked_at,last_http_status,monitor_enabled,review_required,metadata)
  values(s.country_pack_id,s.jurisdiction_id,s.authority_id,s.authority_key,'official','أداة الاستعلام عن أنشطة عجمان — القناة الجديدة','https://ajded.gov.ae/eservice/inquiries/activities-inquiry?lang=ar',reviewed,reviewed,200,true,false,
   jsonb_build_object('service_slug','ajman-business-activity-inquiry','verification_state','OFFICIAL_LINK_AND_DETAILS_VERIFIED','verification_scope','public_inquiry_navigation_and_visible_procedure_availability','review_checkpoint','official-ajman-inquiry-review-2026-10-10','former_official_url','https://eservices.ajmanded.ae/en/activitiesapprovalsinquiry','external_submission_performed',false))
  returning id into nav_id;
 end if;
 select coalesce(max(version),0)+1 into pv from public.hb_policy_versions where policy_key=p.policy_key and jurisdiction_id is not distinct from p.jurisdiction_id;
 select coalesce(max(version),0)+1 into wv from public.hb_workflow_templates where workflow_key=w.workflow_key and jurisdiction_id is not distinct from w.jurisdiction_id;
 select jsonb_agg(case
  when item->>'key'='quality-review' then jsonb_set(jsonb_set(item,'{title}',to_jsonb('مراجعة معلومات الاستعلام؛ لا تتطلب بطاقة DED03.005 مستندات'::text)),'{metadata}',coalesce(item->'metadata','{}'::jsonb)||jsonb_build_object('officialUrl','https://ajded.gov.ae/eservice/inquiries/activities-inquiry?lang=ar','sourceUrl','https://www.ajmanded.ae/en/services/services-directory/inquiry-services/business-activity-inquiry','governmentDetailsVerified',true,'requirements',jsonb_build_array('لا تتطلب بطاقة الخدمة DED03.005 مستندات'),'conditions','الخدمة للاستعلام عن أنشطة الرخصة الاقتصادية. تعرض الأداة الحالية إجراء إصدار رخصة؛ ويظهر التجديد والتعديل قيد التطوير. لا ترسل هذه الصفحة طلب إصدار رخصة.'))
  when item->>'key'='external-execution' then jsonb_set(jsonb_set(item,'{title}',to_jsonb('الاستعلام عن النشاط عبر القناة الحكومية الرسمية'::text)),'{metadata}',coalesce(item->'metadata','{}'::jsonb)||jsonb_build_object('officialUrl','https://ajded.gov.ae/eservice/inquiries/activities-inquiry?lang=ar','executionUrlEn','https://ajded.gov.ae/eservice/inquiries/activities-inquiry?lang=en'))
  when item->>'key'='execution-approval' then jsonb_set(item,'{metadata}',coalesce(item->'metadata','{}'::jsonb)||jsonb_build_object('officialUrl','https://ajded.gov.ae/eservice/inquiries/activities-inquiry?lang=ar'))
  else item end order by ord) into new_steps from jsonb_array_elements(w.definition->'steps') with ordinality as steps(item,ord);
 update public.hb_policy_versions set status='retired',effective_until=reviewed where id=p.id;
 insert into public.hb_policy_versions(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at,country_pack_id)
 values(p.policy_key,p.jurisdiction_id,pv,reviewed,'active',reviewed_rules,array_append(p.source_ids,nav_id),'official-ajman-inquiry-review-2026-10-10',reviewed,p.country_pack_id);
 update public.hb_workflow_templates set status='retired',effective_until=reviewed where id=w.id;
 insert into public.hb_workflow_templates(workflow_key,jurisdiction_id,service_slug,version,status,definition,effective_from,country_pack_id)
 values(w.workflow_key,w.jurisdiction_id,w.service_slug,wv,'active',jsonb_set(jsonb_set(w.definition,'{steps}',new_steps),'{version}',to_jsonb(wv)),reviewed,w.country_pack_id);
 update public.hb_service_bindings set metadata=metadata||jsonb_build_object('officialUrl','https://www.ajmanded.ae/en/services/services-directory/inquiry-services/business-activity-inquiry','executionUrl','https://ajded.gov.ae/eservice/inquiries/activities-inquiry?lang=ar','executionUrlEn','https://ajded.gov.ae/eservice/inquiries/activities-inquiry?lang=en','governmentDetailsVerified',true,'verification_scope','informational_inquiry_card_and_current_route') where service_slug='ajman-business-activity-inquiry' and active;
 update public.hb_policy_sources set source_url='https://www.ajmanded.ae/en/services/services-directory/inquiry-services/business-activity-inquiry',last_verified_at=reviewed,last_checked_at=reviewed,last_http_status=200,monitor_failures=0,monitor_error=null,review_required=false,last_content_hash=null,last_etag=null,last_modified_header=null,
  metadata=metadata||jsonb_build_object('review_checkpoint','official-ajman-inquiry-review-2026-10-10','verification_state','OFFICIAL_LINK_AND_DETAILS_VERIFIED','verification_scope','inquiry_fee_duration_documents_and_current_route','former_official_url','https://eservices.ajmanded.ae/en/activitiesapprovalsinquiry','former_content_hash',s.last_content_hash,'execution_url','https://ajded.gov.ae/eservice/inquiries/activities-inquiry?lang=ar','execution_url_en','https://ajded.gov.ae/eservice/inquiries/activities-inquiry?lang=en','service_code','DED03.005','external_submission_performed',false)
 where id=s.id;
end $ajman_review$;
commit;
