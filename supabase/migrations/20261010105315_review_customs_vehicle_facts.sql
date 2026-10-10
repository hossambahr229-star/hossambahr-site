begin;
do $review$
declare p public.hb_policy_versions%rowtype; s public.hb_policy_sources%rowtype;
 reviewed timestamptz := '2026-10-10T10:53:15Z';
 reviewed_rules jsonb := $facts$[{"id":"requirement:1","when":[],"effect":"review","reason":"نسخة بطاقة العميل أو المفوض أو الشخص مقدم الطلب","actions":["collect_or_verify_requirement"],"sourceRefs":["https://www.dubaicustoms.gov.ae/en/mobile/Pages/ServiceDescription.aspx?serviceid=54"]},{"id":"conditions","when":[],"effect":"review","reason":"عند إلغاء البيان الجمركي يجب إلغاء شهادة تخليص المركبة المرتبطة به.","actions":["review_conditions"],"sourceRefs":["https://www.dubaicustoms.gov.ae/en/mobile/Pages/ServiceDescription.aspx?serviceid=54"]},{"id":"fees","when":[],"effect":"review","reason":"30 درهمًا لكل مركبة وفق بطاقة الخدمة.","actions":["review_fees"],"sourceRefs":["https://www.dubaicustoms.gov.ae/en/mobile/Pages/ServiceDescription.aspx?serviceid=54"]},{"id":"duration","when":[],"effect":"review","reason":"فوري","actions":["review_duration"],"sourceRefs":["https://www.dubaicustoms.gov.ae/en/mobile/Pages/ServiceDescription.aspx?serviceid=54"]}]$facts$::jsonb;
begin
 begin
 select * into strict p from public.hb_policy_versions where policy_key='service:vehicle-clearance-certificate-dubai-customs' and status='active' for update;
 select * into strict s from public.hb_policy_sources where id='54a12cd6-698f-4f2f-99eb-248ecd0d643f'::uuid and source_url='https://www.dubaicustoms.gov.ae/en/mobile/Pages/ServiceDescription.aspx?serviceid=54' and active for update;
 exception when no_data_found then raise notice 'Scoped Production customs records absent in clean seed; skipping.';return;end;
 if p.reviewed_by='official-customs-vehicle-review-2026-10-10' and p.rules=reviewed_rules then return;end if;
 if not(s.id=any(p.source_ids)) then raise exception 'Vehicle policy source mismatch';end if;
 update public.hb_policy_versions set status='retired',effective_until=reviewed where id=p.id;
 insert into public.hb_policy_versions(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at,country_pack_id)
 values(p.policy_key,p.jurisdiction_id,p.version+1,reviewed,'active',reviewed_rules,p.source_ids,'official-customs-vehicle-review-2026-10-10',reviewed,p.country_pack_id);
 update public.hb_policy_sources set last_verified_at=reviewed,last_checked_at=reviewed,last_http_status=200,review_required=false,monitor_failures=0,monitor_error=null,metadata=metadata||jsonb_build_object('review_checkpoint','official-customs-vehicle-review-2026-10-10','verification_state','OFFICIAL_LINK_AND_DETAILS_VERIFIED','verification_scope','vehicle_clearance_documents_fee_duration_and_cancellation_condition') where id=s.id;
end $review$;
commit;
