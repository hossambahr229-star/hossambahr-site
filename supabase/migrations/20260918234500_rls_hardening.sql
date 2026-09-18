-- Global OS RLS hardening
-- Replace recursive organization/member policy checks with safe SECURITY DEFINER helpers.

create or replace function public.hb_is_org_member(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.hb_organization_members m
    where m.organization_id = target_org
      and m.user_id = (select auth.uid())
  );
$$;

create or replace function public.hb_has_org_role(target_org uuid, allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.hb_organization_members m
    where m.organization_id = target_org
      and m.user_id = (select auth.uid())
      and m.role = any(allowed_roles)
  );
$$;

revoke all on function public.hb_is_org_member(uuid) from public, anon;
revoke all on function public.hb_has_org_role(uuid, text[]) from public, anon;
grant execute on function public.hb_is_org_member(uuid) to authenticated;
grant execute on function public.hb_has_org_role(uuid, text[]) to authenticated;

drop policy if exists "organizations visible to members" on public.hb_organizations;
create policy "organizations visible to members"
on public.hb_organizations for select
using (owner_user_id = auth.uid() or public.hb_is_org_member(id));

drop policy if exists "organizations update by owner/admin" on public.hb_organizations;
create policy "organizations update by owner/admin"
on public.hb_organizations for update
using (owner_user_id = auth.uid() or public.hb_has_org_role(id, array['owner','admin']))
with check (owner_user_id = auth.uid() or public.hb_has_org_role(id, array['owner','admin']));

drop policy if exists "members visible in authorized organizations" on public.hb_organization_members;
create policy "members visible in authorized organizations"
on public.hb_organization_members for select
using (
  user_id = auth.uid()
  or public.hb_has_org_role(organization_id, array['owner','admin'])
);

drop policy if exists "cases visible to owner or org members" on public.hb_cases;
create policy "cases visible to owner or org members"
on public.hb_cases for select
using (
  user_id = auth.uid()
  or (organization_id is not null and public.hb_is_org_member(organization_id))
);

drop policy if exists "cases update by user or org admins" on public.hb_cases;
create policy "cases update by user or org admins"
on public.hb_cases for update
using (
  user_id = auth.uid()
  or (organization_id is not null and public.hb_has_org_role(organization_id, array['owner','admin','operator']))
)
with check (
  user_id = auth.uid()
  or (organization_id is not null and public.hb_has_org_role(organization_id, array['owner','admin','operator']))
);

drop policy if exists "tasks visible through case" on public.hb_case_tasks;
create policy "tasks visible through case"
on public.hb_case_tasks for select
using (
  exists (
    select 1 from public.hb_cases c
    where c.id = case_id
      and (
        c.user_id = auth.uid()
        or (c.organization_id is not null and public.hb_is_org_member(c.organization_id))
      )
  )
);

drop policy if exists "documents visible to owner or org members" on public.hb_documents;
create policy "documents visible to owner or org members"
on public.hb_documents for select
using (
  owner_user_id = auth.uid()
  or (organization_id is not null and public.hb_is_org_member(organization_id))
);

drop policy if exists "obligations owned by user or org members" on public.hb_obligations;
create policy "obligations owned by user or org members"
on public.hb_obligations for select
using (
  user_id = auth.uid()
  or (organization_id is not null and public.hb_is_org_member(organization_id))
);

drop policy if exists "audit events visible to related user" on public.hb_audit_events;
create policy "audit events visible to related user"
on public.hb_audit_events for select
using (
  user_id = auth.uid()
  or (organization_id is not null and public.hb_is_org_member(organization_id))
);

drop policy if exists "graph nodes visible to owner or org members" on public.hb_graph_nodes;
create policy "graph nodes visible to owner or org members"
on public.hb_graph_nodes for select
using (
  owner_user_id = auth.uid()
  or (organization_id is not null and public.hb_is_org_member(organization_id))
);

drop policy if exists "graph edges visible to owner or org members" on public.hb_graph_edges;
create policy "graph edges visible to owner or org members"
on public.hb_graph_edges for select
using (
  owner_user_id = auth.uid()
  or (organization_id is not null and public.hb_is_org_member(organization_id))
);

drop policy if exists "snapshots visible through node" on public.hb_entity_snapshots;
create policy "snapshots visible through node"
on public.hb_entity_snapshots for select
using (
  exists (
    select 1 from public.hb_graph_nodes n
    where n.id = node_id
      and (
        n.owner_user_id = auth.uid()
        or (n.organization_id is not null and public.hb_is_org_member(n.organization_id))
      )
  )
);

drop policy if exists "credentials visible to owner or org members" on public.hb_credentials;
create policy "credentials visible to owner or org members"
on public.hb_credentials for select
using (
  owner_user_id = auth.uid()
  or (organization_id is not null and public.hb_is_org_member(organization_id))
);

drop policy if exists "integration connections visible to owner or org members" on public.hb_integration_connections;
create policy "integration connections visible to owner or org members"
on public.hb_integration_connections for select
using (
  user_id = auth.uid()
  or (organization_id is not null and public.hb_is_org_member(organization_id))
);

drop policy if exists "quotes visible to owner or org members" on public.hb_quotes;
create policy "quotes visible to owner or org members"
on public.hb_quotes for select
using (
  user_id = auth.uid()
  or (organization_id is not null and public.hb_is_org_member(organization_id))
);

drop policy if exists "quote items visible through quote" on public.hb_quote_items;
create policy "quote items visible through quote"
on public.hb_quote_items for select
using (
  exists (
    select 1 from public.hb_quotes q
    where q.id = quote_id
      and (
        q.user_id = auth.uid()
        or (q.organization_id is not null and public.hb_is_org_member(q.organization_id))
      )
  )
);

drop policy if exists "payments visible to owner or org members" on public.hb_payment_intents;
create policy "payments visible to owner or org members"
on public.hb_payment_intents for select
using (
  user_id = auth.uid()
  or (organization_id is not null and public.hb_is_org_member(organization_id))
);

drop policy if exists "ledger visible to org members" on public.hb_ledger_entries;
create policy "ledger visible to org members"
on public.hb_ledger_entries for select
using (organization_id is not null and public.hb_is_org_member(organization_id));

alter table public.hb_agents enable row level security;

-- Explicitly restrict orchestration/reliability tables to trusted backend roles.
revoke all on public.hb_agents from anon, authenticated;
revoke insert, update, delete on public.hb_agent_runs from anon, authenticated;
revoke insert, update, delete on public.hb_audit_events from anon, authenticated;
revoke all on public.hb_idempotency_keys from anon, authenticated;
revoke all on public.hb_outbox_events from anon, authenticated;
revoke insert, update, delete on public.hb_integrations from anon, authenticated;
revoke insert, update, delete on public.hb_integration_connections from anon, authenticated;
revoke insert, update, delete on public.hb_payment_intents from anon, authenticated;
revoke insert, update, delete on public.hb_ledger_entries from anon, authenticated;
