-- Current official attestation fee tables; preserve all prior duration/condition rules and source health.
begin;
do $review$
declare item jsonb;p public.hb_policy_versions%rowtype;root_source public.hb_policy_sources%rowtype;fee_source public.hb_policy_sources%rowtype;new_rules jsonb;new_sources uuid[];reviewed timestamptz:='2026-10-12T16:54:03.346Z';
begin
 for item in select value from jsonb_array_elements($plans$[{"slug":"تصديق-مستند-شخصي-داخل-الإمارات","id":"catalog:تصديق مستند شخصي داخل الإمارات","authority":"mofa","cardSource":"https://www.mofa.gov.ae/services/attestation","feeSource":"https://www.mofa.gov.ae/en/services/forms/attestations-guide","fees":"150 درهماً للمستند الشخصي","feesEn":"AED 150 per personal document"},{"slug":"تصديق-مستند-تجاري-دولي-عدا-الفاتورة-وشهادة-المنشأ","id":"catalog:تصديق مستند تجاري دولي (عدا الفاتورة وشهادة المنشأ)","authority":"mofa","cardSource":"https://www.mofa.gov.ae/services/attestation","feeSource":"https://www.mofa.gov.ae/en/services/forms/attestations-guide","fees":"يعرض دليل الوزارة رسمًا قدره 2000 درهم للفئات التجارية المدرجة الصادرة داخل الإمارات أو خارجها، باستثناء فئة «مستند مصدق في الخارج» ضمن الصادر من الإمارات ورسومها 150 درهمًا. راجع فئة المستند والإجمالي قبل الدفع. الفواتير التجارية وشهادات المنشأ خارج نطاق هذه الخدمة.","feesEn":"The Ministry's guide lists AED 2,000 for the listed commercial categories issued inside or outside the UAE, except Document Attested outside among UAE-issued documents, listed at AED 150. Confirm the document category and total before payment. Commercial invoices and certificates of origin are outside this service."}]$plans$::jsonb) loop
  begin
   select * into strict p from public.hb_policy_versions where policy_key='service:'||(item->>'slug') and status='active' for update;
   select * into strict root_source from public.hb_policy_sources where id=any(p.source_ids) and source_url=item->>'cardSource' and authority_key=item->>'authority' and active for update;
  exception when no_data_found then raise notice 'Reviewed MOFA fee identity absent in clean seed: %',item->>'slug';continue;end;
  if root_source.country_pack_id<>p.country_pack_id then raise exception 'MOFA fee source country-pack mismatch';end if;
  begin
   select * into strict fee_source from public.hb_policy_sources where source_url=item->>'feeSource' and country_pack_id=p.country_pack_id for update;
  exception when no_data_found then
   insert into public.hb_policy_sources(jurisdiction_id,authority_key,title,source_url,source_type,last_verified_at,active,metadata,country_pack_id,authority_id,last_checked_at,last_http_status,review_required,monitor_failures)
   values(root_source.jurisdiction_id,root_source.authority_key,'MOFA official attestation fee guide',item->>'feeSource','official',reviewed,true,jsonb_build_object('verification_state','official_source_reverified','verification_scope','current_public_fee_tables_only','verified_fields',jsonb_build_array('fees'),'evidence_runs',jsonb_build_array(38280056238,38280263042,38280523746),'personal_evidence_branch','agent/read-mofa-personal-fee-origins','commercial_evidence_branch','agent/read-mofa-commercial-fee-origins','commercial_exception','UAE-issued Document Attested outside: AED 150; do not infer a blanket AED 2000 fee.'),root_source.country_pack_id,root_source.authority_id,reviewed,200,false,0)
   returning * into fee_source;
  end;
  if fee_source.authority_id<>root_source.authority_id or fee_source.authority_key<>root_source.authority_key or not fee_source.active then raise exception 'MOFA fee-guide authority identity mismatch';end if;
  select coalesce(jsonb_agg(value order by ordinality),'[]'::jsonb) into new_rules from jsonb_array_elements(p.rules) with ordinality where value->>'id'<>'fees';
  new_rules:=new_rules||jsonb_build_array(jsonb_build_object('id','fees','when','[]'::jsonb,'effect','review','reason',item->>'fees','actions',jsonb_build_array('review_fees'),'sourceRefs',jsonb_build_array(item->>'feeSource')));
  new_sources:=case when fee_source.id=any(p.source_ids) then p.source_ids else array_append(p.source_ids,fee_source.id) end;
  if not(p.reviewed_by='official-mofa-fee-guide-review-2026-10-12' and p.rules=new_rules and p.source_ids=new_sources) then
   update public.hb_policy_versions set status='retired',effective_until=reviewed where id=p.id;
   insert into public.hb_policy_versions(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at,country_pack_id)
   values(p.policy_key,p.jurisdiction_id,p.version+1,reviewed,'active',new_rules,new_sources,'official-mofa-fee-guide-review-2026-10-12',reviewed,p.country_pack_id);
  end if;
 end loop;
end $review$;
commit;
