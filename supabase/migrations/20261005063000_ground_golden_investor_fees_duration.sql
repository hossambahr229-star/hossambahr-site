-- Attach the newly source-reviewed investor fees/time to authoritative AI policy rules.
do $migration$
declare binding public.hb_service_bindings%rowtype; prior public.hb_policy_versions%rowtype; next_version integer; next_rules jsonb;
begin
 select * into strict binding from public.hb_service_bindings where service_slug='golden-residency-uae' and active and metadata->>'public_catalog'='true';
 select * into strict prior from public.hb_policy_versions where policy_key=binding.policy_key and jurisdiction_id=binding.jurisdiction_id and status='active';
 if prior.reviewed_by='gdrfa_official_ai_grounding_20261005' then return; end if;
 if binding.metadata->>'lastReviewed' is distinct from '2026-10-05' or prior.reviewed_by is distinct from 'gdrfa_official_review_20261005' then raise exception 'Golden investor official source review must precede AI grounding'; end if;
 if nullif(trim(binding.metadata->>'fees'),'') is null or nullif(trim(binding.metadata->>'duration'),'') is null then raise exception 'Reviewed fee/time values are required'; end if;
 select coalesce(jsonb_agg(rule),'[]'::jsonb) into next_rules from jsonb_array_elements(prior.rules) rule where rule->>'id' not in ('fees','duration');
 next_rules:=next_rules||jsonb_build_array(
  jsonb_build_object('id','fees','when','[]'::jsonb,'effect','review','reason',binding.metadata->>'fees','actions',jsonb_build_array('confirm_government_fees_before_payment'),'sourceRefs',jsonb_build_array('https://www.gdrfad.gov.ae/en/services/8ea80da4-f43e-11eb-0320-0050569629e8')),
  jsonb_build_object('id','duration','when','[]'::jsonb,'effect','review','reason',binding.metadata->>'duration','actions',jsonb_build_array('confirm_processing_time_with_authority'),'sourceRefs',jsonb_build_array('https://www.gdrfad.gov.ae/en/services/8ea80da4-f43e-11eb-0320-0050569629e8'))
 );
 update public.hb_policy_versions set status='retired',effective_until=now() where id=prior.id;
 select coalesce(max(version),0)+1 into next_version from public.hb_policy_versions where policy_key=binding.policy_key and jurisdiction_id=binding.jurisdiction_id;
 insert into public.hb_policy_versions(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at,country_pack_id)
 values(binding.policy_key,binding.jurisdiction_id,next_version,now(),'active',next_rules,prior.source_ids,'gdrfa_official_ai_grounding_20261005',now(),prior.country_pack_id);
end
$migration$;
