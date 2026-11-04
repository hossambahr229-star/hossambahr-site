-- Reviewed public facts only; no schema, Auth, Storage or access changes.
begin;
do $review$
declare b public.hb_service_bindings%rowtype; p public.hb_policy_versions%rowtype; rules jsonb;
 marker text := 'icp-visitor-conditions-2026-11-04';
 source_url text := 'https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e60';
 conditions_text text := 'لفئة زيارة الأقارب والأصدقاء في مسار ICP: تأمين صحي ساري داخل الإمارات، وجواز صالح لمدة 6 أشهر على الأقل، وتذكرة عودة. عند كفالة مقيم: الحد الأدنى للراتب الشهري 4000 درهم لأقارب الدرجة الأولى، و8000 للدرجتين الثانية والثالثة، و15000 للأصدقاء، مع إثبات صلة القرابة بحسب الدرجة. يجب أن يكون ملف الكفيل نشطًا. الدخول خلال 60 يومًا من الإصدار؛ وقد تمدد الصلاحية وفق القواعد. الإقامة 30 أو 60 أو 90 يومًا بحسب الخيار، والتمديد بقرار الهيئة ضمن إجمالي 120 يومًا. هذه شروط منشورة وليست تأكيدًا لأهلية حالة بعينها.';
 notes_text text := 'رُوجعت الشروط ضمن فئة زيارة الأقارب والأصدقاء المختارة في بطاقة ICP. تعرض قائمة المستندات الرسمية أيضًا مستندات لحالات خاصة دون بيان انطباقها جميعًا؛ لذلك تبقى قائمة المستندات الكاملة وأهلية الحالة قيد المراجعة. لا نعرض التقرير الطبي أو مستند إقامة الزوج في دولة خليجية كشرط عام لكل زيارة. راجع المستندات المطلوبة لحالتك في الطلب الرسمي قبل التقديم.';
begin
 select * into strict b from public.hb_service_bindings where active and service_slug='تأشيرة-زيارة-قريب-أو-صديق-عبر-icp-خارج-دبي' for update;
 select * into strict p from public.hb_policy_versions where policy_key=b.policy_key and jurisdiction_id is not distinct from b.jurisdiction_id and status='active' for update;
 if p.reviewed_by=marker then
  if not exists(select 1 from jsonb_array_elements(p.rules) r where r->>'id'='conditions' and r->>'reason'=conditions_text) then raise exception 'Reviewed conditions drift'; end if;
  return;
 end if;
 if p.id<>'5422e3a8-655c-4474-8aad-403673d0f5f8'::uuid or p.version<>2 or p.reviewed_by<>'icp-tourism-visitor-facts-2026-10-29' then raise exception 'Unexpected visitor policy checkpoint';end if;
 if not exists(select 1 from jsonb_array_elements(p.rules) r where r->>'id'='conditions' and r->>'reason'='غير موثق بعد') then raise exception 'Conditions already reviewed';end if;
 if p.source_ids<>array['9444c7c1-1f91-46be-bcb8-b1b20fd20698'::uuid] then raise exception 'Source set changed';end if;
 select coalesce(jsonb_agg(value),'[]'::jsonb) into rules from jsonb_array_elements(p.rules) where value->>'id' not in ('conditions','special-cases');
 rules:=rules||jsonb_build_array(
 jsonb_build_object('id','conditions','when','[]'::jsonb,'effect','review','reason',conditions_text,'actions',jsonb_build_array('review_conditions'),'sourceRefs',jsonb_build_array(source_url)),
 jsonb_build_object('id','special-cases','when','[]'::jsonb,'effect','review','reason',notes_text,'actions',jsonb_build_array('review_special_cases'),'sourceRefs',jsonb_build_array(source_url)));
 update public.hb_policy_versions set status='retired',effective_until=now() where id=p.id;
 insert into public.hb_policy_versions(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at,country_pack_id)
 values(p.policy_key,p.jurisdiction_id,3,now(),'active',rules,p.source_ids,marker,now(),p.country_pack_id);
 update public.hb_service_bindings set metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('lastReviewed','2026-11-04','conditions_review',marker,'eligibilityScope','common-only') where id=b.id;
end $review$;
commit;
