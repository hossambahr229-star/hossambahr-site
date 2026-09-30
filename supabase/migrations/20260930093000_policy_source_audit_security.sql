-- Explicit backend-only access policies for policy source audit tables.

drop policy if exists "backend only deny client access" on public.hb_policy_source_check_runs;
create policy "backend only deny client access"
on public.hb_policy_source_check_runs
for all
to public
using(false)
with check(false);

drop policy if exists "backend only deny client access" on public.hb_policy_source_reviews;
create policy "backend only deny client access"
on public.hb_policy_source_reviews
for all
to public
using(false)
with check(false);

create index if not exists hb_policy_source_reviews_reviewer_idx
  on public.hb_policy_source_reviews(reviewed_by,reviewed_at desc);
