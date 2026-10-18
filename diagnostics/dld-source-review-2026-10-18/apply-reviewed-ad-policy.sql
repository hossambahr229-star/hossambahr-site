begin;
do $review$
declare p public.hb_policy_versions%rowtype; new_rules jsonb; next_version integer; reviewed timestamptz:=now();
begin
 select * into strict p from public.hb_policy_versions where policy_key='service:dld-real-estate-ad-permit-dubai' and status='active' for update;
 if p.reviewed_by='dld-ad-verified-eligibility-2026-10-18' then return;end if;
 if p.version<>2 or not exists(select 1 from jsonb_array_elements(p.rules) r where r->>'id'='conditions' and r->>'reason' like 'شركة أو جهة تحمل ترخيص نشاط عقاري مناسب في دبي.;%') then raise exception 'Active policy changed; re-review before applying';end if;
 select jsonb_agg(case when r->>'id'='conditions' then jsonb_set(r,'{reason}',to_jsonb($text$إذا كان مقدم الطلب وسيطًا عقاريًا، يلزم عقد تسويق مع مالك العقار لأنواع الإعلان المحددة في بطاقة الخدمة.; يجب تقديم مستندات المعرض قبل موعده بشهر على الأقل، ولا يسمح بالبيع أثناء المعرض بل بالحجوزات المبدئية فقط.; يلزم فاصل 30 يومًا بين معارض الدولة نفسها، ولا تُعرض عقارات دبي على الخارطة غير المسجلة لدى إدارة حسابات الضمان.$text$::text)) else r end order by ord) into new_rules from jsonb_array_elements(p.rules) with ordinality a(r,ord);
 select coalesce(max(version),0)+1 into next_version from public.hb_policy_versions where policy_key=p.policy_key and jurisdiction_id is not distinct from p.jurisdiction_id;
 update public.hb_policy_versions set status='retired',effective_until=reviewed where id=p.id;
 insert into public.hb_policy_versions(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at,country_pack_id) values(p.policy_key,p.jurisdiction_id,next_version,reviewed,'active',new_rules,p.source_ids,'dld-ad-verified-eligibility-2026-10-18',reviewed,p.country_pack_id);
 update public.hb_policy_sources set last_verified_at=reviewed,review_required=false,metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('reverified_at',reviewed,'review_checkpoint','dld-ad-verified-eligibility-2026-10-18','verification_scope','documents_conditional_requirements_fees_duration','verification_state','OFFICIAL_LINK_AND_DETAILS_VERIFIED','review_source_ar','https://dubailand.gov.ae/ar/eservices/real-estate-ad-permit/','reverified_reason','Current AR and EN service tabs compared. Unsupported blanket company eligibility removed; actual conditional broker/exhibition requirements preserved.') where id='0e5ca3f0-cbcc-438a-9825-e5900d0c3063' and id=any(p.source_ids) and source_url='https://dubailand.gov.ae/en/eservices/real-estate-ad-permit/' and active;
 if not found then raise exception 'Expected scoped source absent';end if;
end $review$;
commit;
