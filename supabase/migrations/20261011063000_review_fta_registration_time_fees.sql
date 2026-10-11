begin;
do $review$
declare item jsonb;p public.hb_policy_versions%rowtype;s public.hb_policy_sources%rowtype;new_rules jsonb;
 reviewed timestamptz := '2026-10-11T06:28:04Z';
begin
 for item in select value from jsonb_array_elements($plans$[{"slug":"corporate-tax-registration-uae","source":"https://tax.gov.ae/ar/services/corporate.tax.registration.aspx","fees":"خدمة التسجيل مجانية وفق بطاقة الهيئة.","duration":"مراجعة الهيئة: 20 يوم عمل من استلام الطلب المكتمل. الزمن المتوقع لتقديم الطلب: 25 دقيقة."},{"slug":"vat-registration-uae","source":"https://tax.gov.ae/ar/services/vat.registration.aspx","fees":"خدمة التسجيل مجانية وفق بطاقة الهيئة.","duration":"مراجعة الهيئة: 20 يوم عمل من استلام الطلب المكتمل. الزمن المتوقع لتقديم الطلب: 45 دقيقة."}]$plans$::jsonb) loop
  begin
   select * into strict p from public.hb_policy_versions where policy_key='service:'||(item->>'slug') and status='active' for update;
   select * into strict s from public.hb_policy_sources where id=any(p.source_ids) and source_url=item->>'source' and authority_key='fta' and active for update;
  exception when no_data_found then raise notice 'Scoped FTA records absent in clean seed: %',item->>'slug';continue;end;
  select coalesce(jsonb_agg(value order by ordinality),'[]'::jsonb) into new_rules from jsonb_array_elements(p.rules) with ordinality where coalesce(value->>'id','') not in ('fees','duration');
  new_rules:=new_rules||jsonb_build_array(
   jsonb_build_object('id','fees','when','[]'::jsonb,'effect','review','reason',item->>'fees','actions',jsonb_build_array('review_fees'),'sourceRefs',jsonb_build_array(item->>'source')),
   jsonb_build_object('id','duration','when','[]'::jsonb,'effect','review','reason',item->>'duration','actions',jsonb_build_array('review_duration'),'sourceRefs',jsonb_build_array(item->>'source')));
  if p.reviewed_by='official-fta-registration-time-fee-review-2026-10-11' and p.rules=new_rules then continue;end if;
  update public.hb_policy_versions set status='retired',effective_until=reviewed where id=p.id;
  insert into public.hb_policy_versions(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at,country_pack_id)
  values(p.policy_key,p.jurisdiction_id,p.version+1,reviewed,'active',new_rules,p.source_ids,'official-fta-registration-time-fee-review-2026-10-11',reviewed,p.country_pack_id);
  update public.hb_policy_sources set last_verified_at=reviewed,last_checked_at=reviewed,last_http_status=200,review_required=false,monitor_failures=0,monitor_error=null,metadata=metadata||jsonb_build_object('review_checkpoint','official-fta-registration-time-fee-review-2026-10-11','verification_scope','registration_fee_and_submission_vs_review_time_from_matching_current_card') where id=s.id;
 end loop;
end $review$;
commit;
