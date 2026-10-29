-- Versioned public facts only. No schema, permissions, RLS or operational workflow changes.
begin;
do $review$
declare items jsonb := $facts$[{"slug":"تأشيرة-سياحية-عبر-icp-خارج-دبي","expectedPolicyId":"cbb4b170-ca87-4c06-b931-73d611fbd601","documents":["جواز سفر.","صورة شخصية.","بيان البرنامج السياحي."],"conditions":"هذه التفاصيل لفئة المنشآت السياحية المخولة بإصدار تأشيرات السياحة، ويجب أن تكون المنشأة قائمة وتمارس نشاطها. للزائر: تأمين صحي ساري داخل الإمارات، جواز صالح 6 أشهر على الأقل، وتذكرة عودة. البقاء 30 أو 60 أو 90 يومًا حسب الخيار؛ التمديد بقرار الهيئة ضمن إجمالي 120 يومًا. الدخول الأول خلال 60 يومًا من الإصدار، مع إمكان تمديد الصلاحية وفق القواعد. استرداد الضمان يتطلب طلبًا وإلغاء التأشيرة أو مغادرة المستفيد دون مخالفات إقامة.","fees":"بنود بطاقة ICP بالدرهم: طلب 100؛ إصدار دخول واحد 100 عن كل شهر أو دخول متعدد 200 عن كل شهر؛ خدمات ذكية 100. الضمان المالي: 1000 للدخول الواحد أو 2000 للمتعدد، ورسم إيداع الضمان 20. الضمان منفصل عن الرسوم، ولا تجمع البدائل تلقائيًا. يحدد الطلب الرسمي البنود المطبقة؛ لا تشمل رسوم حسام بحر.","duration":"يومان (2) وفق مدة إنجاز خدمة إصدار التأشيرة في بطاقة ICP؛ لا تحدد البطاقة أنها أيام عمل، وليست مدة الإقامة أو ضمانًا للموافقة.","specialCases":"تمت مراجعة فئة المنشآت السياحية بالاختيار المباشر في بطاقة ICP، وليس النص المجمّع للفئات. لا تشمل تأشيرة السياحة متعددة الدخول لمدة 5 سنوات. تتعارض أرقام غرامة المنشأة غير النشطة بين موضعين بالبطاقة، لذلك لا نؤكد مبلغ هذه الغرامة. لا يفيد مسار البطاقة أن كل فرد مؤهل للتقديم المباشر بنفسه.","steps":"افتح بطاقة ICP واختر فئة المتعامل المطابقة للطلب. ← قدم الطلب عبر القناة الرسمية المناسبة وراجع البيانات. ← أرفق مستندات الفئة إذا تعذر استرجاعها آليًا. ← سدد البنود المستحقة التي يعرضها الطلب الرسمي. ← استلم نتيجة المعاملة.","category":"Tourism establishments authorized to issue visit visas for tourism purposes"},{"slug":"تأشيرة-زيارة-قريب-أو-صديق-عبر-icp-خارج-دبي","expectedPolicyId":"b44a783b-17fb-4065-bce8-b70f00178847","fees":"بنود بطاقة ICP بالدرهم: طلب 100؛ إصدار دخول واحد 100 عن كل شهر أو دخول متعدد 200 عن كل شهر؛ خدمات ذكية 100. الضمان المالي: 1000 للدخول الواحد أو 2000 للمتعدد، ورسم إيداع الضمان 20. الضمان منفصل عن الرسوم، ولا تجمع البدائل تلقائيًا. يحدد الطلب الرسمي البنود المطبقة؛ لا تشمل رسوم حسام بحر.","duration":"يومان (2) وفق مدة إنجاز خدمة إصدار التأشيرة في بطاقة ICP؛ لا تحدد البطاقة أنها أيام عمل، وليست مدة الإقامة أو ضمانًا للموافقة.","specialCases":"رُوجعت الرسوم ومدة الإنجاز ضمن فئة زيارة الأقارب والأصدقاء المختارة في بطاقة ICP. المستندات وأهلية كل حالة ما زالت تحتاج مراجعة؛ لا تنقل مستندات السياحة أو العلاج إلى هذه الخدمة.","steps":"افتح بطاقة ICP واختر فئة المتعامل المطابقة للطلب. ← قدم الطلب عبر القناة الرسمية المناسبة وراجع البيانات. ← أرفق مستندات الفئة إذا تعذر استرجاعها آليًا. ← سدد البنود المستحقة التي يعرضها الطلب الرسمي. ← استلم نتيجة المعاملة.","category":"Visitor – For visiting relatives, friends"}]$facts$::jsonb;
 item jsonb; b public.hb_service_bindings%rowtype; p public.hb_policy_versions%rowtype;
 rules jsonb; fact record; doc jsonb; i integer; marker text:='icp-tourism-visitor-facts-2026-10-29';
 reviewed_url text:='https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e60';
begin
 perform 1 from public.hb_policy_sources s where s.id='9444c7c1-1f91-46be-bcb8-b1b20fd20698'::uuid and s.authority_key='icp' and s.source_url=reviewed_url and s.active;
 if not found then raise exception 'Canonical ICP source checkpoint changed';end if;
 for item in select value from jsonb_array_elements(items) loop
  select * into strict b from public.hb_service_bindings where service_slug=item->>'slug' and active for update;
  select * into strict p from public.hb_policy_versions where policy_key=b.policy_key and jurisdiction_id is not distinct from b.jurisdiction_id and status='active' for update;
  if p.reviewed_by=marker then
   if b.metadata->>'fees'<>item->>'fees' or b.metadata->>'duration'<>item->>'duration' then raise exception 'Reviewed metadata drift';end if;
   if not exists(select 1 from jsonb_array_elements(p.rules) r where r->>'id'='fees' and r->>'reason'=item->>'fees') then raise exception 'Reviewed fees drift';end if;
   continue;
  end if;
  if p.version<>1 or p.id<>(item->>'expectedPolicyId')::uuid or p.reviewed_by<>'service-matrix-review' then raise exception 'Unexpected service policy checkpoint';end if;
  if b.metadata->>'fees'<>'غير موثق بعد' or b.metadata->>'duration'<>'غير موثق بعد' then raise exception 'Recorded facts changed';end if;
  if p.source_ids<>array['9444c7c1-1f91-46be-bcb8-b1b20fd20698'::uuid] then raise exception 'Source set changed';end if;
  select coalesce(jsonb_agg(value),'[]'::jsonb) into rules from jsonb_array_elements(p.rules)
   where value->>'id' not in ('fees','duration','special-cases','official-steps')
   and (not(item?'conditions') or value->>'id'<>'conditions')
   and (not(item?'documents') or value->>'id' not like 'requirement%');
  if item?'documents' then
   i:=0;for doc in select value from jsonb_array_elements(item->'documents') loop
    i:=i+1;rules:=rules||jsonb_build_array(jsonb_build_object('id','requirement-'||i,'when','[]'::jsonb,'effect','review','reason',doc#>>'{}','actions',jsonb_build_array('review_requirement'),'sourceRefs',jsonb_build_array(reviewed_url)));
   end loop;
  end if;
  for fact in select key,value from jsonb_each_text(jsonb_build_object('fees',item->>'fees','duration',item->>'duration','special-cases',item->>'specialCases','official-steps',item->>'steps')||case when item?'conditions' then jsonb_build_object('conditions',item->>'conditions') else '{}'::jsonb end) loop
   rules:=rules||jsonb_build_array(jsonb_build_object('id',fact.key,'when','[]'::jsonb,'effect','review','reason',fact.value,'actions',jsonb_build_array('review_'||replace(fact.key,'-','_')),'sourceRefs',jsonb_build_array(reviewed_url)));
  end loop;
  update public.hb_policy_versions set status='retired',effective_until=now() where id=p.id;
  insert into public.hb_policy_versions(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at,country_pack_id)
   values(p.policy_key,p.jurisdiction_id,2,now(),'active',rules,p.source_ids,marker,now(),p.country_pack_id);
  update public.hb_service_bindings set metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('fees',item->>'fees','duration',item->>'duration','lastReviewed','2026-10-29','recorded_detail_review',marker,'reviewed_category',item->>'category') where id=b.id;
 end loop;
 -- Page availability review, not a claim that all categories have verified details.
 update public.hb_policy_sources set last_verified_at=now(),metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('last_category_review','2026-10-29','category_review_scope','Tourism category facts; visitor fees and duration only. No complete visitor document or eligibility inference.')
 where id='9444c7c1-1f91-46be-bcb8-b1b20fd20698'::uuid;
end $review$;
commit;
