-- Scope-integrity and column-level privilege hardening for browser clients.

drop policy if exists "cases insert by user" on public.hb_cases;
create policy "cases insert by user"
on public.hb_cases for insert
with check (
  user_id=auth.uid()
  and (organization_id is null or public.hb_is_org_member(organization_id))
);

drop policy if exists "documents insert by owner" on public.hb_documents;
create policy "documents insert by owner"
on public.hb_documents for insert
with check (
  owner_user_id=auth.uid()
  and (organization_id is null or public.hb_is_org_member(organization_id))
  and (
    case_id is null
    or exists(
      select 1 from public.hb_cases c
      where c.id=case_id and (
        c.user_id=auth.uid()
        or (c.organization_id is not null and public.hb_is_org_member(c.organization_id))
      )
    )
  )
);

drop policy if exists "consents owned by user" on public.hb_consents;
create policy "consents owned by user"
on public.hb_consents for all
using (
  user_id=auth.uid()
  and (organization_id is null or public.hb_is_org_member(organization_id))
)
with check (
  user_id=auth.uid()
  and (organization_id is null or public.hb_is_org_member(organization_id))
);

drop policy if exists "scenarios owned by user" on public.hb_scenarios;
create policy "scenarios owned by user"
on public.hb_scenarios for all
using (
  user_id=auth.uid()
  and (organization_id is null or public.hb_is_org_member(organization_id))
)
with check (
  user_id=auth.uid()
  and (organization_id is null or public.hb_is_org_member(organization_id))
);

drop policy if exists "portable profiles owned by user" on public.hb_portable_profiles;
create policy "portable profiles owned by user"
on public.hb_portable_profiles for all
using(owner_user_id=auth.uid())
with check(
  owner_user_id=auth.uid()
  and (
    subject_node_id is null
    or exists(
      select 1 from public.hb_graph_nodes n
      where n.id=subject_node_id and (
        n.owner_user_id=auth.uid()
        or (n.organization_id is not null and public.hb_is_org_member(n.organization_id))
      )
    )
  )
);

-- Client-created organizations cannot transfer ownership or tenancy by direct UPDATE.
revoke update on public.hb_organizations from authenticated;
grant update(legal_name,trade_name,jurisdiction_id,registration_number,lifecycle_status,metadata)
on public.hb_organizations to authenticated;

-- Case lifecycle/status is controlled by trusted workflow logic after creation.
revoke update on public.hb_cases from authenticated;

-- Approval decisions may change only the decision status; audit fields are set by trigger.
revoke update on public.hb_approvals from authenticated;
grant update(status) on public.hb_approvals to authenticated;

create or replace function public.hb_stamp_approval_decision()
returns trigger
language plpgsql
security invoker
set search_path=''
as $$
begin
  if new.status is distinct from old.status and new.status in ('approved','rejected') then
    new.decided_by=(select auth.uid());
    new.decided_at=now();
  end if;
  return new;
end;
$$;

drop trigger if exists hb_approval_decision_stamp on public.hb_approvals;
create trigger hb_approval_decision_stamp
before update of status on public.hb_approvals
for each row execute function public.hb_stamp_approval_decision();

-- Notification clients may only mark their own notifications read/dismissed.
revoke update on public.hb_notifications from authenticated;
grant update(status) on public.hb_notifications to authenticated;

create or replace function public.hb_stamp_notification_read()
returns trigger
language plpgsql
security invoker
set search_path=''
as $$
begin
  if new.status='read' and old.status is distinct from 'read' then
    new.read_at=now();
  end if;
  return new;
end;
$$;

drop trigger if exists hb_notification_read_stamp on public.hb_notifications;
create trigger hb_notification_read_stamp
before update of status on public.hb_notifications
for each row execute function public.hb_stamp_notification_read();
