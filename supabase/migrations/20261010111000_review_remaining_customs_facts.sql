begin;
do $review$
declare item jsonb;p public.hb_policy_versions%rowtype;s public.hb_policy_sources%rowtype;new_rules jsonb;
 reviewed timestamptz := '2026-10-10T11:10:00Z';
begin
 for item in select value from jsonb_array_elements($plans$[{"slug":"dubai-customs-business-registration","source":"https://www.dubaicustoms.gov.ae/en/mobile/Pages/ServiceDescription.aspx?serviceid=17","fees":"100 درهم، إضافة إلى 20 درهمًا للمعرفة والابتكار وفق بطاقة الخدمة.","duration":"يوم عمل واحد"},{"slug":"submit-customs-declaration-dubai","source":"https://www.dubaicustoms.gov.ae/en/mobile/Pages/ServiceDescription.aspx?serviceid=18","fees":"من 15 إلى 100 درهم بحسب نوع البيان وقناة الشحن، مع إضافة رسوم المعرفة والابتكار عند انطباقها.","duration":"ساعتا عمل وفق بطاقة الخدمة"}]$plans$::jsonb) loop
  begin
   select * into strict p from public.hb_policy_versions where policy_key='service:'||(item->>'slug') and status='active' for update;
   select * into strict s from public.hb_policy_sources where id=any(p.source_ids) and source_url=item->>'source' and authority_key='dubai-customs' and active for update;
  exception when no_data_found then raise notice 'Scoped customs records absent in clean seed: %',item->>'slug';continue;end;
  select coalesce(jsonb_agg(value order by ordinality),'[]'::jsonb) into new_rules from jsonb_array_elements(p.rules) with ordinality where value->>'id' not in ('fees','duration');
  new_rules:=new_rules||jsonb_build_array(
   jsonb_build_object('id','fees','when','[]'::jsonb,'effect','review','reason',item->>'fees','actions',jsonb_build_array('review_fees'),'sourceRefs',jsonb_build_array(item->>'source')),
   jsonb_build_object('id','duration','when','[]'::jsonb,'effect','review','reason',item->>'duration','actions',jsonb_build_array('review_duration'),'sourceRefs',jsonb_build_array(item->>'source')));
  if p.reviewed_by='official-customs-remaining-facts-review-2026-10-10' and p.rules=new_rules then continue;end if;
  update public.hb_policy_versions set status='retired',effective_until=reviewed where id=p.id;
  insert into public.hb_policy_versions(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at,country_pack_id)
  values(p.policy_key,p.jurisdiction_id,p.version+1,reviewed,'active',new_rules,p.source_ids,'official-customs-remaining-facts-review-2026-10-10',reviewed,p.country_pack_id);
  update public.hb_policy_sources set last_verified_at=reviewed,last_checked_at=reviewed,last_http_status=200,review_required=false,monitor_failures=0,monitor_error=null,metadata=metadata||jsonb_build_object('review_checkpoint','official-customs-remaining-facts-review-2026-10-10','verification_scope','existing_recorded_fee_and_duration_rechecked_against_matching_current_card') where id=s.id;
 end loop;
end $review$;
commit;
