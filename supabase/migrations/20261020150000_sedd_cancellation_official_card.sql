-- One existing SEDD cancellation service. Preserve RLS, old policy history and unrelated sources.
begin;
do $review$
declare
 b public.hb_service_bindings%rowtype;
 p public.hb_policy_versions%rowtype;
 old_source public.hb_policy_sources%rowtype;
 new_source uuid;
 new_rules jsonb;
 field_key text;
 item jsonb := $facts${"requirements":["خطاب من وزارة الموارد البشرية والتوطين يثبت إلغاء بطاقة المنشأة.","أخذ بصمة المستثمر أو ممثله القانوني في مركز تقديم الخدمة."],"fees":"رسوم منشورة ومشروطة: إعلان الإلغاء 350 درهمًا؛ إلغاء الرخصة من 150 إلى 3000 درهم. محو السجل: 500 درهم إذا انتهت الرخصة لأقل من سنة، و1000 من سنة إلى سنتين، و1500 لسنتين فأكثر. لا تمثل البنود إجماليًا ثابتًا؛ تؤكد SEDD المبلغ بحسب الحالة.","duration":"7 أيام وفق بطاقة إلغاء الرخصة؛ تخضع النتيجة لاستكمال الإجراءات وانقضاء مدة الإعلان القانونية، وليست ضمانًا لإغلاق الشركة والعمالة خلال هذه المدة.","conditions":"لإلغاء الرخصة نهائيًا بعد الإجراءات القانونية والإعلان، وليس تجميدها. يجب مراجعة متطلبات العمالة وبطاقة المنشأة مع وزارة الموارد البشرية والتوطين؛ إلغاء الرخصة لا يعني أن المنصة ألغت تصاريح العمل. زر البدء الظاهر في البطاقة يشير إلى مسار إصدار رخصة؛ نربط ببطاقة المعلومات ونطلب تأكيد مسار الإلغاء من SEDD.","sourceUrl":"https://sedd.ae/ar/w/license-issuance-copy-"}$facts$::jsonb;
 review_tag text := 'sedd-cancellation-card-2026-10-20';
begin
 select * into strict b from public.hb_service_bindings where service_slug='sharjah-economic-license-cancellation' and active for update;
 if exists(select 1 from public.hb_policy_versions where policy_key=b.policy_key and jurisdiction_id is not distinct from b.jurisdiction_id and status='active' and reviewed_by=review_tag) then return;end if;
 select * into strict p from public.hb_policy_versions where policy_key=b.policy_key and jurisdiction_id is not distinct from b.jurisdiction_id and status='active' for update;
 if p.version<>1 then raise exception 'Unexpected SEDD cancellation policy version: %',p.version;end if;
 select * into strict old_source from public.hb_policy_sources where id=any(p.source_ids) and active and authority_key=b.authority_key and source_url='https://sedd.ae/ar/other-services';
 insert into public.hb_policy_sources(jurisdiction_id,authority_key,title,source_url,source_type,last_verified_at,active,metadata,country_pack_id,authority_id)
 values(b.jurisdiction_id,b.authority_key,'إلغاء رخصة — بطاقة SEDD الرسمية',item->>'sourceUrl','official',now(),true,jsonb_build_object('service_slug',b.service_slug,'review_tag',review_tag,'execution_route_verified',false),old_source.country_pack_id,old_source.authority_id) returning id into new_source;
 select coalesce(jsonb_agg(value),'[]'::jsonb) into new_rules from jsonb_array_elements(p.rules) where value->>'id' not in ('fees','duration','conditions') and value->>'id' not like 'requirement%';
 select new_rules||jsonb_agg(jsonb_build_object('id','requirement-reviewed-'||ordinality,'when','[]'::jsonb,'effect','review','reason',value#>>'{}','actions',jsonb_build_array('collect_or_verify_requirement'),'sourceRefs',jsonb_build_array(item->>'sourceUrl'))) into new_rules from jsonb_array_elements(item->'requirements') with ordinality;
 for field_key in select unnest(array['fees','duration','conditions']) loop
  new_rules:=new_rules||jsonb_build_array(jsonb_build_object('id',field_key,'when','[]'::jsonb,'effect','review','reason',item->>field_key,'actions',jsonb_build_array('review_'||field_key),'sourceRefs',jsonb_build_array(item->>'sourceUrl')));
 end loop;
 update public.hb_policy_versions set status='retired',effective_until=now() where id=p.id;
 insert into public.hb_policy_versions(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at,country_pack_id)
 values(p.policy_key,p.jurisdiction_id,2,now(),'active',new_rules,array[new_source],review_tag,now(),p.country_pack_id);
 update public.hb_service_bindings set metadata=metadata||jsonb_build_object('officialUrl',item->>'sourceUrl','fees',item->>'fees','duration',item->>'duration','lastReviewed','2026-10-20','recorded_detail_review',review_tag,'source_scope_unresolved',false,'execution_route_verified',false) where id=b.id;
end $review$;
commit;
