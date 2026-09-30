-- Allow the internal deterministic quality engine to process confidential
-- document metadata without transferring document content externally.
update public.hb_ai_models
set
  allowed_data_classes = (
    select array_agg(distinct x order by x)
    from unnest(allowed_data_classes || array['confidential']::text[]) x
  ),
  metadata = coalesce(metadata,'{}'::jsonb) || jsonb_build_object(
    'confidential_scope','safe_metadata_only',
    'external_transfer',false
  )
where provider='hossambahr'
  and model_key='quality-engine-v1'
  and not ('confidential'=any(allowed_data_classes));
