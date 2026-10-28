-- Publish only reviewed processing time; preserve all missing-detail and operational safeguards.
begin;
do $review$
declare item jsonb := $facts${"slug":"تأشيرة-استكشاف-فرص-عمل-عبر-icp-خارج-دبي","duration":"يومان (2) وفق بطاقات ICP لمدد 60 و90 و120 يوماً؛ لم تحدد البطاقات أنهما يوما عمل. هذه مدة إتمام الخدمة وليست مدة البقاء.","cards":[{"durationDays":60,"informationUrl":"https://icp.gov.ae/en/services-details/?serviceid=68e3509b5ae59b00117383ea","reviewedAt":"2026-10-27"},{"durationDays":90,"informationUrl":"https://icp.gov.ae/en/services-details/?serviceid=68e350ab5ae59b00117383ed","reviewedAt":"2026-10-27"},{"durationDays":120,"informationUrl":"https://icp.gov.ae/en/services-details/?serviceid=68e356135ae59b001173842d","reviewedAt":"2026-10-27"}]}$facts$::jsonb;
 b public.hb_service_bindings%rowtype; p public.hb_policy_versions%rowtype;
 card jsonb; sid uuid; ids uuid[]; rules jsonb; marker text:='icp-job-processing-time-2026-10-28';
begin
 select * into strict b from public.hb_service_bindings where service_slug=item->>'slug' and active for update;
 select * into strict p from public.hb_policy_versions where policy_key=b.policy_key and jurisdiction_id is not distinct from b.jurisdiction_id and status='active' for update;
 if p.reviewed_by=marker then
  if not exists(select 1 from jsonb_array_elements(p.rules) r where r->>'id'='duration' and r->>'reason'=item->>'duration') then raise exception 'Reviewed duration drift';end if;
  return;
 end if;
 if p.version<>1 or p.id<>'6b5e9e50-0044-4d0c-a0f2-87201a87bb1a'::uuid or p.reviewed_by<>'service-matrix-review' then raise exception 'Unexpected job exploration policy checkpoint';end if;
 if b.metadata->>'fees'<>'غير موثق بعد' or b.metadata->>'duration'<>'غير موثق بعد' then raise exception 'Recorded facts changed; review before publishing';end if;
 if jsonb_array_length(p.rules)<>2 or exists(select 1 from jsonb_array_elements(p.rules) r where r->>'id' not in ('conditions','special-cases')) then raise exception 'Policy rules changed';end if;
 ids:=p.source_ids;
 for card in select value from jsonb_array_elements(item->'cards') loop
  if exists(select 1 from public.hb_policy_sources where source_url=card->>'informationUrl') then raise exception 'Duration source already exists; inspect before reuse';end if;
  insert into public.hb_policy_sources(jurisdiction_id,authority_key,title,source_url,source_type,last_verified_at,active,metadata,country_pack_id,authority_id,review_required)
   values(b.jurisdiction_id,'icp','ICP job exploration visa — '||(card->>'durationDays')||' days; processing time only',card->>'informationUrl','official',now(),true,
   jsonb_build_object('review_tag',marker,'review_method','OFFICIAL_WEB_READ','reviewed_at','2026-10-28','duration_days',(card->>'durationDays')::integer,'scope','Processing time only; documents, fees and eligibility unverified; working days not specified'),b.country_pack_id,b.authority_id,false) returning id into sid;
  ids:=array_append(ids,sid);
 end loop;
 rules:=p.rules||jsonb_build_array(jsonb_build_object('id','duration','when','[]'::jsonb,'effect','review','reason',item->>'duration','actions',jsonb_build_array('review_duration'),'sourceRefs',(select jsonb_agg(value->>'informationUrl') from jsonb_array_elements(item->'cards'))));
 update public.hb_policy_versions set status='retired',effective_until=now() where id=p.id;
 insert into public.hb_policy_versions(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at,country_pack_id) values(p.policy_key,p.jurisdiction_id,2,now(),'active',rules,ids,marker,now(),p.country_pack_id);
 update public.hb_service_bindings set metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('duration',item->>'duration','lastReviewed','2026-10-28','recorded_detail_review',marker) where id=b.id;
end $review$;
commit;
