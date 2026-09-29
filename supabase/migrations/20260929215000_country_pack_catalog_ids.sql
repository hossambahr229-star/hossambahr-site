-- Expose active Country Pack ids for case UI labels.

drop function if exists public.hb_active_country_packs();

create function public.hb_active_country_packs()
returns table(
  pack_id uuid,
  pack_key text,
  country_code text,
  name_ar text,
  name_en text,
  default_locale text,
  default_currency text,
  supported_languages text[],
  capabilities jsonb,
  version integer
)
language sql
stable
security invoker
set search_path=''
as $$
  select
    cp.id,
    cp.pack_key,
    j.code,
    j.name_ar,
    j.name_en,
    cp.default_locale,
    cp.default_currency,
    cp.supported_languages,
    cp.capabilities,
    cp.version
  from public.hb_country_packs cp
  join public.hb_jurisdictions j on j.id=cp.country_jurisdiction_id
  where cp.status='active' and j.active=true
  order by j.name_en,cp.version desc
$$;

grant execute on function public.hb_active_country_packs() to anon,authenticated;
