-- Data-only reviewed facts. No schema, RLS, grants or operational workflow changes.
begin;
do $review$
declare item jsonb; b public.hb_service_bindings%rowtype; p public.hb_policy_versions%rowtype; src public.hb_policy_sources%rowtype; rules jsonb; k text;
begin
 for item in select value from jsonb_array_elements($facts$[{"slug":"تقرير-تفاصيل-الإقامة-عبر-icp","sourceUrl":"https://icp.gov.ae/en/services-details/?serviceid=68e353815ae59b0011738413","fees":"رسوم الطلب 100 درهم ورسوم الخدمات الذكية 100 درهم وفق بطاقة ICP. لا تتضمن هذه القيم أي رسوم لحسام بحر.","conditions":"يجب أن يكون لدى المتعامل ملف إقامة فعال وفق بطاقة ICP.","specialCases":"بطاقة ICP تعرض ضمن المستندات بنودًا مرتبطة بتغيير المهنة؛ لا نؤكد انطباقها على طباعة التقرير دون توضيح من الجهة. مدة الإنجاز غير منشورة في البطاقة المقروءة.","steps":["تقديم الطلب عبر القناة المختارة.","مراجعة النموذج وتصحيح البيانات المسترجعة عند الحاجة.","دفع الرسوم المطلوبة.","استلام التقرير النهائي."]},{"slug":"سداد-غرامة-مخالفة-تأشيرة-أو-إقامة-عبر-icp-خارج-دبي","sourceUrl":"https://icp.gov.ae/en/services-details/?serviceid=68e73faf5ae59b00117389f1","fees":"50 درهمًا عن كل يوم في حالات انتهاء مدة البقاء أو إلغاء/انتهاء التأشيرة أو الإقامة أو تصريح المغادرة أو تسجيل المولود المذكورة في البطاقة. سوء استخدام الخدمات الذكية: 2000 درهم عند انطباق المخالفة. رسم الخدمات الذكية: 100 درهم. هذه بنود مختلفة وليست مجموعًا ثابتًا، ويحدد سجل المخالفة المبلغ المستحق. لا تتضمن رسوم حسام بحر.","conditions":"يجب تعديل الوضع أو مغادرة دولة الإمارات بعد سداد الغرامات المتعلقة بالتأشيرة أو الإقامة. تتطلب القناة الرسمية تسجيل الدخول بالهوية الرقمية UAE Pass.","specialCases":"تظهر خانة المستندات في بطاقة ICP بصيغة N/A؛ لا نفسرها على أنها إعفاء مؤكد من كل متطلب. مدة الإنجاز غير منشورة في البطاقة المقروءة.","steps":["تقديم الطلب عبر القناة المختارة.","مراجعة النموذج وتصحيح البيانات المسترجعة عند الحاجة.","إتمام سداد الغرامة."]}]$facts$::jsonb) loop
  select * into strict b from public.hb_service_bindings where service_slug=item->>'slug' and active for update;
  select * into strict p from public.hb_policy_versions where policy_key=b.policy_key and jurisdiction_id is not distinct from b.jurisdiction_id and status='active' for update;
  if p.reviewed_by='icp-reports-fines-live-2026-10-16' then continue; end if;
  if p.version<>1 then raise exception 'Unexpected ICP policy version: %',b.service_slug; end if;
  select * into strict src from public.hb_policy_sources where id=any(p.source_ids) and authority_key='icp' and source_url=item->>'sourceUrl' and active and not review_required;
  select coalesce(jsonb_agg(value),'[]'::jsonb) into rules from jsonb_array_elements(p.rules) where value->>'id' not in ('fees','conditions','special-cases','official-steps');
  for k in select unnest(array['fees','conditions','special-cases']) loop
   rules:=rules||jsonb_build_array(jsonb_build_object('id',k,'when','[]'::jsonb,'effect','review','reason',case when k='special-cases' then item->>'specialCases' else item->>k end,'actions',jsonb_build_array('review_'||replace(k,'-','_')),'sourceRefs',jsonb_build_array(src.source_url)));
  end loop;
  rules:=rules||jsonb_build_array(jsonb_build_object('id','official-steps','when','[]'::jsonb,'effect','review','reason',(select string_agg(value#>>'{}',' ← ' order by ordinality) from jsonb_array_elements(item->'steps') with ordinality),'actions',jsonb_build_array('review_official_steps'),'sourceRefs',jsonb_build_array(src.source_url)));
  update public.hb_policy_versions set status='retired',effective_until=now() where id=p.id;
  insert into public.hb_policy_versions(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at,country_pack_id) values(p.policy_key,p.jurisdiction_id,2,now(),'active',rules,p.source_ids,'icp-reports-fines-live-2026-10-16',now(),p.country_pack_id);
  update public.hb_service_bindings set metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('fees',item->>'fees','loginRequired',true,'lastReviewed','2026-10-16','recorded_detail_review','icp-reports-fines-live-2026-10-16') where id=b.id;
  update public.hb_policy_sources set last_verified_at=now(),metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('review_method','LIVE_OFFICIAL_BROWSER','reviewed_at','2026-10-16','http_status_not_captured',true) where id=src.id;
 end loop;
end $review$;
commit;
