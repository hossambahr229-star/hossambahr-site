-- Publish already reviewed common facts only. No schema, grants, RLS or workflow changes.
begin;
do $review$
declare item jsonb := $facts${"slug":"تأشيرة-استكشاف-فرص-تأسيس-الأعمال-عبر-icp-خارج-دبي","documents":["جواز السفر.","الصورة الشخصية.","موافقة مبدئية من الجهات المعنية لتأسيس الأعمال وفق قائمة بطاقة ICP.","كشف حساب مختوم يغطي ستة أشهر على الأقل.","صورة الهوية الشخصية للمتقدمين من أفغانستان أو إيران أو العراق وفق البطاقة.","شهادة البكالوريوس أو ما يعادلها من المؤهلات العلمية وفق بطاقة ICP."],"duration":"يومان (2) وفق بطاقات ICP لمدد 60 و90 و120 يوماً؛ لم تحدد البطاقات أنهما يوما عمل. هذه مدة إتمام الخدمة وليست مدة البقاء.","conditions":"الشروط المشتركة المنشورة: جواز صالح لستة أشهر على الأقل وتأمين صحي ساري داخل الدولة. الدخول خلال 60 يوماً من الإصدار؛ هذه مهلة دخول وليست مدة البقاء المختارة (60 أو 90 أو 120 يوماً). استرداد الضمان بطلب بعد الإلغاء أو المغادرة، مع إلغاء التأشيرة بعد المغادرة وعدم وجود مخالفات إقامة، وفق البطاقة. هذه شروط مشتركة وليست تأكيداً كاملاً للأهلية بحسب النشاط أو الحالة.","specialCases":"المستندات والمدة والشروط المشتركة مراجعة في بطاقات ICP الثلاث بتاريخ 2026-10-27. يلزم التحقق من انطباق الموافقة المبدئية والمؤهل على الحالة من الجهة. الرسوم غير موثقة بالكامل في سجل المنصة؛ تختلف بعض البنود بين البطاقات ولا نؤكد إجمالياً موحداً أو إعفاء. اختيار مدة البقاء من البطاقات أدناه لا يغيّر مهلة الدخول المنشورة.","cards":[{"durationDays":60,"informationUrl":"https://icp.gov.ae/en/services-details/?serviceid=68f5bc018c587a0011cb16c1","reviewedAt":"2026-10-27"},{"durationDays":90,"informationUrl":"https://icp.gov.ae/en/services-details/?serviceid=68e350315ae59b00117383e7","reviewedAt":"2026-10-27"},{"durationDays":120,"informationUrl":"https://icp.gov.ae/en/services-details/?serviceid=68f5bc368c587a0011cb16c5","reviewedAt":"2026-10-27"}]}$facts$::jsonb;
 b public.hb_service_bindings%rowtype; p public.hb_policy_versions%rowtype;
 card jsonb; doc jsonb; sid uuid; ids uuid[]; rules jsonb; i integer:=0; marker text:='icp-business-common-facts-2026-10-27';
begin
 select * into strict b from public.hb_service_bindings where service_slug=item->>'slug' and active for update;
 select * into strict p from public.hb_policy_versions where policy_key=b.policy_key and jurisdiction_id is not distinct from b.jurisdiction_id and status='active' for update;
 if p.reviewed_by=marker then return; end if;
 if p.version<>1 or p.id<>'0c20a67f-fd4f-4353-b915-7b0e33cf8db4'::uuid or p.reviewed_by<>'service-matrix-review' then raise exception 'Unexpected business exploration policy checkpoint';end if;
 if b.metadata->>'fees'<>'غير موثق بعد' then raise exception 'Fee record changed; review before publishing';end if;
 ids:=p.source_ids;
 for card in select value from jsonb_array_elements(item->'cards') loop
  if exists(select 1 from public.hb_policy_sources where source_url=card->>'informationUrl') then raise exception 'Duration source already exists; inspect before reuse';end if;
  insert into public.hb_policy_sources(jurisdiction_id,authority_key,title,source_url,source_type,last_verified_at,active,metadata,country_pack_id,authority_id,review_required)
   values(b.jurisdiction_id,'icp','ICP business exploration visa — '||(card->>'durationDays')||' days; common reviewed facts',card->>'informationUrl','official',now(),true,
   jsonb_build_object('review_tag',marker,'review_method','OFFICIAL_WEB_READ','reviewed_at','2026-10-27','duration_days',(card->>'durationDays')::integer,'scope','Common documents, conditions and processing time only; fees and complete eligibility unverified'),b.country_pack_id,b.authority_id,false) returning id into sid;
  ids:=array_append(ids,sid);
 end loop;
 select coalesce(jsonb_agg(value),'[]'::jsonb) into rules from jsonb_array_elements(p.rules) where value->>'id' not in ('conditions','duration','special-cases') and value->>'id' not like 'requirement%';
 for doc in select value from jsonb_array_elements(item->'documents') loop
  i:=i+1;rules:=rules||jsonb_build_array(jsonb_build_object('id','requirement-'||i,'when','[]'::jsonb,'effect','review','reason',doc#>>'{}','actions',jsonb_build_array('review_requirement'),'sourceRefs',(select jsonb_agg(value->>'informationUrl') from jsonb_array_elements(item->'cards'))));
 end loop;
 for card in select jsonb_build_object('id',key,'value',value) from jsonb_each_text(jsonb_build_object('conditions',item->>'conditions','duration',item->>'duration','special-cases',item->>'specialCases')) loop
  rules:=rules||jsonb_build_array(jsonb_build_object('id',card->>'id','when','[]'::jsonb,'effect','review','reason',card->>'value','actions',jsonb_build_array('review_'||replace(card->>'id','-','_')),'sourceRefs',(select jsonb_agg(value->>'informationUrl') from jsonb_array_elements(item->'cards'))));
 end loop;
 update public.hb_policy_versions set status='retired',effective_until=now() where id=p.id;
 insert into public.hb_policy_versions(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at,country_pack_id) values(p.policy_key,p.jurisdiction_id,2,now(),'active',rules,ids,marker,now(),p.country_pack_id);
 update public.hb_service_bindings set metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('duration',item->>'duration','lastReviewed','2026-10-27','recorded_detail_review',marker,'eligibilityScope','common-only') where id=b.id;
end $review$;
commit;
