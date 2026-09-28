-- Explainable deterministic service resolver for free-form user goals.

create or replace function hb_private.normalize_service_search(p_value text)
returns text
language sql
immutable
set search_path=''
as $$
  select trim(
    regexp_replace(
      translate(lower(coalesce(p_value,'')),'أإآىةؤئ','ااايهوي'),
      '[ًٌٍَُِّْـ]+','','g'
    )
  )
$$;

revoke all on function hb_private.normalize_service_search(text) from public,anon,authenticated;

create or replace function public.hb_resolve_service_candidates(
  p_query text,p_limit integer default 5
)
returns table(
  service_slug text,service_name text,service_type text,emirate text,category text,
  authority_key text,fees text,duration text,official_url text,score integer
)
language sql stable security invoker set search_path=''
as $$
with query_input as (
  select hb_private.normalize_service_search(left(btrim(coalesce(p_query,'')),1200)) as q
),
tokens as (
  select distinct token
  from query_input,regexp_split_to_table(q,'[[:space:][:punct:]]+') as token
  where char_length(token)>=3
    and token not in (
      'اريد','عايز','احتاج','محتاج','ابغى','ابي','عمل','طلب','خدمه','معامله',
      'كيف','ممكن','عندي','لدي','داخل','خارج','الامارات','الاماراتي',
      'the','and','for','with','want','need','service','request'
    )
),
catalog as (
  select
    b.service_slug,
    coalesce(b.metadata->>'name',b.service_slug) as service_name,
    coalesce(b.metadata->>'type','') as service_type,
    coalesce(b.metadata->>'emirate','') as emirate,
    coalesce(b.metadata->>'category','') as category,
    b.authority_key,
    coalesce(b.metadata->>'fees','') as fees,
    coalesce(b.metadata->>'duration','') as duration,
    coalesce(b.metadata->>'officialUrl','') as official_url,
    hb_private.normalize_service_search(coalesce(b.metadata->>'name','')) as norm_name,
    hb_private.normalize_service_search(concat_ws(' ',
      b.service_slug,b.metadata->>'name',b.metadata->>'type',b.metadata->>'emirate',
      b.metadata->>'category',b.authority_key
    )) as haystack
  from public.hb_service_bindings b
  where b.active=true
),
scored as (
  select c.*,
    (
      case
        when c.norm_name=(select q from query_input) then 120
        when c.norm_name like '%'||(select q from query_input)||'%' and char_length((select q from query_input))>=4 then 70
        when c.haystack like '%'||(select q from query_input)||'%' and char_length((select q from query_input))>=4 then 45
        else 0
      end
      +
      coalesce((
        select sum(case
          when c.norm_name like '%'||t.token||'%' then 18
          when c.haystack like '%'||t.token||'%' then 9
          else 0 end)::integer
        from tokens t
      ),0)
    )::integer as match_score
  from catalog c
)
select s.service_slug,s.service_name,s.service_type,s.emirate,s.category,s.authority_key,
       s.fees,s.duration,s.official_url,s.match_score as score
from scored s
where s.match_score>0
order by s.match_score desc,s.service_name
limit least(greatest(coalesce(p_limit,5),1),10)
$$;

revoke all on function public.hb_resolve_service_candidates(text,integer) from public,anon;
grant execute on function public.hb_resolve_service_candidates(text,integer) to authenticated;
