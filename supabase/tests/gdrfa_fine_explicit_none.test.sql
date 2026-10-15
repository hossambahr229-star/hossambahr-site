begin;select plan(3);
select is((select count(*)::integer from public.hb_policy_versions where reviewed_by='gdrfa-fine-explicit-none-2026-10-15' and version=3 and status='active'),1,'Fine collection policy updated once');
select ok(exists(select 1 from public.hb_policy_versions p cross join lateral jsonb_array_elements(p.rules) r where p.reviewed_by='gdrfa-fine-explicit-none-2026-10-15' and p.status='active' and r->>'id' like 'requirement%' and r->>'reason'='لا توجد مستندات مطلوبة وفق بطاقة الخدمة الرسمية.'),'Explicit no-documents fact is available to AI');
select ok(exists(select 1 from public.hb_policy_versions p cross join lateral jsonb_array_elements(p.rules) r where p.reviewed_by='gdrfa-fine-explicit-none-2026-10-15' and p.status='active' and r->>'id'='fees' and r->>'reason' like '%مبلغ المخالفات%'),'Outstanding fines are never described as free');
select * from finish();rollback;
