-- Verified general conditions only; preserve incomplete category eligibility and all unrelated policy facts.
begin;
do $review$
declare b public.hb_service_bindings%rowtype;p public.hb_policy_versions%rowtype;new_rules jsonb;
fact text := $fact$الشروط العامة الموثقة: صلاحية جواز السفر لا تقل عن 6 أشهر، واستمرار استيفاء متطلبات إصدار الإقامة عند التجديد. لا تثبت هذه الشروط العامة أهلية فئة بعينها؛ اختر الفئة في بطاقة ICP وطابق متطلباتها قبل التقديم.$fact$;
review_tag text := 'icp-renewal-common-conditions-2026-10-22';
begin
 select * into b from public.hb_service_bindings where service_slug='تجديد-تصريح-إقامة-عبر-icp-خارج-دبي' and active for update;
 if not found then raise notice 'ICP renewal review deferred: binding absent from this catalog';return;end if;
 if exists(select 1 from public.hb_policy_versions where policy_key=b.policy_key and jurisdiction_id is not distinct from b.jurisdiction_id and status='active' and reviewed_by=review_tag) then return;end if;
 select * into strict p from public.hb_policy_versions where policy_key=b.policy_key and jurisdiction_id is not distinct from b.jurisdiction_id and status='active' for update;
 if p.version<>2 then raise exception 'Unexpected ICP renewal policy version: %',p.version;end if;
 if (select count(*) from jsonb_array_elements(p.rules) r where r->>'id'='conditions' and r->>'reason'='غير موثق بعد')<>1 then raise exception 'Expected one previously unverified common conditions rule';end if;
 select jsonb_agg(case when value->>'id'='conditions' then value||jsonb_build_object('reason',fact) else value end order by ordinality) into new_rules from jsonb_array_elements(p.rules) with ordinality;
 update public.hb_policy_versions set status='retired',effective_until=now() where id=p.id;
 insert into public.hb_policy_versions(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at,country_pack_id)
 values(p.policy_key,p.jurisdiction_id,3,now(),'active',new_rules,p.source_ids,review_tag,now(),p.country_pack_id);
 update public.hb_service_bindings set metadata=metadata||jsonb_build_object('lastReviewed','2026-10-22','recorded_detail_review',review_tag,'eligibility_scope','common-only','category_specific_eligibility_verified',false) where id=b.id;
end $review$;
commit;
