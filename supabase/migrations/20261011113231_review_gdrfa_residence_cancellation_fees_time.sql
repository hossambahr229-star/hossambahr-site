begin;
do $review$
declare item jsonb;p public.hb_policy_versions%rowtype;s public.hb_policy_sources%rowtype;new_rules jsonb;
 reviewed timestamptz := '2026-10-11T11:32:31Z';
begin
 for item in select value from jsonb_array_elements($plans$[{"slug":"cancel-residency-permit-uae","source":"https://gdrfad.gov.ae/en/services/0613ab0e-5858-11ea-0320-0050569629e8","fees":"رسم إلغاء تصريح الإقامة 100 درهم، و10 دراهم للمعرفة و10 دراهم للابتكار، وفق بطاقة GDRFA.","duration":"48 ساعة وفق بطاقة GDRFA؛ لم تُحدد أنها ساعات عمل."}]$plans$::jsonb) loop
  begin
   select * into strict p from public.hb_policy_versions where policy_key='service:'||(item->>'slug') and status='active' for update;
   select * into strict s from public.hb_policy_sources where id=any(p.source_ids) and source_url=item->>'source' and authority_key='gdrfa-dubai' and active for update;
  exception when no_data_found then raise notice 'Scoped GDRFA cancellation records absent in clean seed: %',item->>'slug';continue;end;
  select coalesce(jsonb_agg(value order by ordinality),'[]'::jsonb) into new_rules from jsonb_array_elements(p.rules) with ordinality where coalesce(value->>'id','') not in ('fees','duration');
  new_rules:=new_rules||jsonb_build_array(
   jsonb_build_object('id','fees','when','[]'::jsonb,'effect','review','reason',item->>'fees','actions',jsonb_build_array('review_fees'),'sourceRefs',jsonb_build_array(item->>'source')),
   jsonb_build_object('id','duration','when','[]'::jsonb,'effect','review','reason',item->>'duration','actions',jsonb_build_array('review_duration'),'sourceRefs',jsonb_build_array(item->>'source')));
  if p.reviewed_by='official-gdrfa-residence-cancellation-fee-time-2026-10-11' and p.rules=new_rules then continue;end if;
  update public.hb_policy_versions set status='retired',effective_until=reviewed where id=p.id;
  insert into public.hb_policy_versions(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at,country_pack_id)
  values(p.policy_key,p.jurisdiction_id,p.version+1,reviewed,'active',new_rules,p.source_ids,'official-gdrfa-residence-cancellation-fee-time-2026-10-11',reviewed,p.country_pack_id);
  update public.hb_policy_sources set last_verified_at=reviewed,last_checked_at=reviewed,last_http_status=200,review_required=false,monitor_failures=0,monitor_error=null,metadata=metadata||jsonb_build_object('review_checkpoint','official-gdrfa-residence-cancellation-fee-time-2026-10-11','verification_scope','residence_cancellation_fee_and_expected_hours_only_from_matching_current_card') where id=s.id;
 end loop;
end $review$;
commit;
