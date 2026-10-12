begin;
do $review$
declare item jsonb;field text;p public.hb_policy_versions%rowtype;s public.hb_policy_sources%rowtype;new_rules jsonb;
 synced timestamptz := '2026-10-12T06:40:00Z';
begin
 for item in select value from jsonb_array_elements($plans$[{"slug":"rta-modify-trade-license-noc-dubai","source":"https://www.rta.ae/wps/portal/rta/ae/home/rta-services/service-details?serviceId=534","verifiedAlias":"https://www.rta.ae/wps/portal/rta/ae/home/rta-services/service-details?serviceId=534","authority":"rta-dubai","fields":["fees","duration"],"fees":"تختلف الرسوم حسب نوع التعديل ورمز نشاط النقل؛ تعرض بطاقة RTA جدول الرسوم التفصيلي، ورسوم حذف النشاط 220 درهمًا وفق البطاقة الحالية.","feesEn":"Fees vary by modification type and transport activity code; the official card provides the full table and currently lists AED 220 for removing an activity.","duration":"من 3 إلى 15 يوم عمل بحسب الموافقات المطلوبة.","durationEn":"3 to 15 working days depending on required approvals.","nameAr":"طلب شهادة عدم ممانعة لتعديل رخصة تجارية من RTA","nameEn":"Apply for an NOC to Modify a Trade Licence","sourceReviewedAt":"2026-10-08","evidenceScope":"Field-specific review of four canonical service cards. This does not certify the entire catalog or reset historical full-record review dates."},{"slug":"rta-renew-trade-license-noc-dubai","source":"https://www.rta.ae/wps/portal/rta/ae/home/rta-services/service-details?serviceId=438","verifiedAlias":"https://rta.ae/wps/portal/rta/ae/home/rta-services/service-details?lang=en&serviceId=438","authority":"rta-dubai","fields":["fees"],"fees":"تختلف الرسوم حسب رمز نشاط النقل التجاري وتظهر في جدول النشاط وصفحة الدفع الرسمية.","feesEn":"Fees vary by commercial transport activity code and appear in the official activity table and payment screen.","nameAr":"طلب شهادة عدم ممانعة لتجديد رخصة تجارية من RTA","nameEn":"Apply for an NOC to Renew a Trade Licence","sourceReviewedAt":"2026-10-08","evidenceScope":"Field-specific review of four canonical service cards. This does not certify the entire catalog or reset historical full-record review dates."}]$plans$::jsonb) loop
  begin
   select * into strict p from public.hb_policy_versions where policy_key='service:'||(item->>'slug') and status='active' for update;
   select * into strict s from public.hb_policy_sources where id=any(p.source_ids) and source_url=item->>'source' and authority_key=item->>'authority' and active for update;
  exception when no_data_found then raise notice 'Reviewed RTA NOC policy absent in clean seed: %',item->>'slug';continue;end;
  select coalesce(jsonb_agg(value order by ordinality),'[]'::jsonb) into new_rules
  from jsonb_array_elements(p.rules) with ordinality
  where not (coalesce(value->>'id','') in (select jsonb_array_elements_text(item->'fields')));
  for field in select jsonb_array_elements_text(item->'fields') loop
   if field not in ('fees','duration') or coalesce(item->>field,'')='' or item->>field ~ 'غير موثق|غير مسجل' then raise exception 'Unreviewed RTA NOC field: % %',item->>'slug',field;end if;
   new_rules:=new_rules||jsonb_build_array(jsonb_build_object('id',field,'when','[]'::jsonb,'effect','review','reason',item->>field,'actions',jsonb_build_array('review_'||field),'sourceRefs',jsonb_build_array(item->>'source')));
  end loop;
  if p.reviewed_by='reviewed-rta-noc-field-sync-2026-10-12' and p.rules=new_rules then continue;end if;
  update public.hb_policy_versions set status='retired',effective_until=synced where id=p.id;
  insert into public.hb_policy_versions(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at,country_pack_id)
  values(p.policy_key,p.jurisdiction_id,p.version+1,synced,'active',new_rules,p.source_ids,'reviewed-rta-noc-field-sync-2026-10-12',synced,p.country_pack_id);
  update public.hb_policy_sources set metadata=metadata||jsonb_build_object('reviewed_fields_grounding_checkpoint','reviewed-rta-noc-field-sync-2026-10-12','reviewed_fields_grounding_synced_at',synced,'reused_source_reviewed_at',item->>'sourceReviewedAt','reviewed_fields_grounding_scope','Only October 8 reviewed RTA NOC fee notes and modification duration. Renewal source alias is recorded in the manifest; no new source-health claim. Activity-dependent fees remain conditional.') where id=s.id;
 end loop;
end $review$;
commit;
