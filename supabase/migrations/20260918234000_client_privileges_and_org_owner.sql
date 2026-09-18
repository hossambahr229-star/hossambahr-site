-- Explicit client privileges for user-facing Global OS surfaces.
-- RLS remains the authorization boundary. Service-only tables remain ungranted.

revoke all on public.hb_organizations from anon;
revoke all on public.hb_organization_members from anon;
revoke all on public.hb_cases from anon;
revoke all on public.hb_case_tasks from anon;
revoke all on public.hb_documents from anon;
revoke all on public.hb_consents from anon;
revoke all on public.hb_obligations from anon;
revoke all on public.hb_approvals from anon;
revoke all on public.hb_quotes from anon;
revoke all on public.hb_quote_items from anon;
revoke all on public.hb_payment_intents from anon;

grant select, insert, update on public.hb_organizations to authenticated;
grant select on public.hb_organization_members to authenticated;
grant select, insert, update on public.hb_cases to authenticated;
grant select on public.hb_case_tasks to authenticated;
grant select, insert on public.hb_documents to authenticated;
grant select, insert, update, delete on public.hb_consents to authenticated;
grant select on public.hb_obligations to authenticated;
grant select, update on public.hb_approvals to authenticated;
grant select on public.hb_quotes to authenticated;
grant select on public.hb_quote_items to authenticated;
grant select on public.hb_payment_intents to authenticated;

-- Organizations: owner may also remove their own draft organization.
create policy "organizations delete by owner"
on public.hb_organizations for delete
using (owner_user_id = auth.uid());

-- Organization creation automatically records the owner membership.
create or replace function public.hb_add_owner_membership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.hb_organization_members (organization_id, user_id, role)
  values (new.id, new.owner_user_id, 'owner')
  on conflict (organization_id, user_id) do update set role = 'owner';
  return new;
end;
$$;

revoke all on function public.hb_add_owner_membership() from public, anon, authenticated;

drop trigger if exists hb_organization_owner_membership on public.hb_organizations;
create trigger hb_organization_owner_membership
after insert on public.hb_organizations
for each row execute function public.hb_add_owner_membership();
