-- Platform translations distinguish two existing services; no government facts change.
update public.hb_service_bindings
set metadata=jsonb_set(coalesce(metadata,'{}'::jsonb),'{name_en}',to_jsonb(case service_slug
 when 'تصديق-مستند-شخصي-داخل-الإمارات' then 'Attest a Personal Document in the UAE'
 when 'تصديق-مستند-تجاري-دولي-عدا-الفاتورة-وشهادة-المنشأ' then 'Attest an International Commercial Document (excluding invoices and certificates of origin)'
 end::text),true)
where metadata->>'public_catalog'='true'
and service_slug in ('تصديق-مستند-شخصي-داخل-الإمارات','تصديق-مستند-تجاري-دولي-عدا-الفاتورة-وشهادة-المنشأ');
