-- One existing WPS guidance record; no fee, document, duration or security-policy inference.
begin;
do $review$
declare b public.hb_service_bindings%rowtype;p public.hb_policy_versions%rowtype;old_source public.hb_policy_sources%rowtype;new_source uuid;new_rules jsonb;field_key text;
item jsonb := $facts${"conditions":"للمنشآت المسجلة لدى وزارة الموارد البشرية والتوطين؛ تُدفع الأجور عبر بنوك ومؤسسات مالية معتمدة من مصرف الإمارات العربية المتحدة المركزي.","specialCases":"هذا مسار إرشادي لنظام حماية الأجور، وليس نموذج تسجيل حكوميًا مباشرًا. لا توثق هذه المراجعة مستندات التسجيل أو الرسوم أو مدة التفعيل؛ أكدها مع الوزارة ووكيل الدفع المعتمد.","sourceUrl":"https://www.dubai.ae/wages-protection-system"}$facts$::jsonb;
review_tag text := 'wps-official-guidance-2026-10-21';
begin
 select * into b from public.hb_service_bindings where service_slug='التسجيل-والمتابعة-في-wps' and active for update;
 if not found then raise notice 'WPS guidance review deferred: binding absent from this catalog';return;end if;
 if exists(select 1 from public.hb_policy_versions where policy_key=b.policy_key and jurisdiction_id is not distinct from b.jurisdiction_id and status='active' and reviewed_by=review_tag) then return;end if;
 select * into strict p from public.hb_policy_versions where policy_key=b.policy_key and jurisdiction_id is not distinct from b.jurisdiction_id and status='active' for update;
 if p.version<>1 then raise exception 'Unexpected WPS policy version: %',p.version;end if;
 select * into strict old_source from public.hb_policy_sources where id=any(p.source_ids) and active and authority_key=b.authority_key and source_url='https://www.mohre.gov.ae/en/guidance-and-awareness-portal-new/wages-protection-system';
 insert into public.hb_policy_sources(jurisdiction_id,authority_key,title,source_url,source_type,last_verified_at,active,metadata,country_pack_id,authority_id)
 values(b.jurisdiction_id,b.authority_key,'WPS — دليل حكومة دبي الرسمي',item->>'sourceUrl','official',now(),true,jsonb_build_object('service_slug',b.service_slug,'review_tag',review_tag,'execution_route_verified',false,'destination_kind','OFFICIAL_GUIDANCE','supporting_official_url','https://centralbank.ae/en/our-operations/payments-and-settlements/uae-wages-protection-system-uaewps/'),old_source.country_pack_id,old_source.authority_id) returning id into new_source;
 select coalesce(jsonb_agg(value),'[]'::jsonb) into new_rules from jsonb_array_elements(p.rules) where value->>'id' not in ('conditions','special-cases');
 for field_key in select unnest(array['conditions','specialCases']) loop
  new_rules:=new_rules||jsonb_build_array(jsonb_build_object('id',case when field_key='specialCases' then 'special-cases' else field_key end,'when','[]'::jsonb,'effect','review','reason',item->>field_key,'actions',jsonb_build_array(case when field_key='specialCases' then 'review_special_cases' else 'review_conditions' end),'sourceRefs',jsonb_build_array(item->>'sourceUrl')));
 end loop;
 update public.hb_policy_versions set status='retired',effective_until=now() where id=p.id;
 insert into public.hb_policy_versions(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at,country_pack_id)
 values(p.policy_key,p.jurisdiction_id,2,now(),'active',new_rules,array[new_source],review_tag,now(),p.country_pack_id);
 update public.hb_service_bindings set metadata=metadata||jsonb_build_object('officialUrl',item->>'sourceUrl','lastReviewed','2026-10-21','recorded_detail_review',review_tag,'destination_kind','OFFICIAL_GUIDANCE','execution_route_verified',false) where id=b.id;
end $review$;
commit;
