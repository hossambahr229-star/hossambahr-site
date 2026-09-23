-- Preserve repository migration versions after the connector-based production rollout.
-- Only the exact connector entries recorded during this deployment are reconciled.
delete from supabase_migrations.schema_migrations
where version='20260923055614' and name='auth_profiles_and_transactions'
  and exists(select 1 from supabase_migrations.schema_migrations where version='20260829010000' and name='auth_profiles_and_transactions');

with deployed(connector_version,repository_version,migration_name) as (values
('20260923055644','20260918230000','global_os_foundation'),
('20260923055657','20260918231000','policy_workflow_catalog'),
('20260923055700','20260918232000','reliability_outbox'),
('20260923055701','20260918233000','business_graph_finance_integrations'),
('20260923055703','20260918234000','client_privileges_and_org_owner'),
('20260923055705','20260918234500','rls_hardening'),
('20260923055922','20260918235000','multitenant_ai_gateway'),
('20260923055924','20260918235500','developer_platform_protocol'),
('20260923055926','20260919000500','document_vault'),
('20260923055928','20260919000600','document_registration_rpc'),
('20260923055930','20260919001000','operations_orchestrator'),
('20260923055932','20260919001500','crm_marketplace_enterprise'),
('20260923055933','20260919002000','compliance_simulation_intelligence'),
('20260923055935','20260919002500','rls_scope_integrity'),
('20260923055937','20260919003000','event_driven_agents'),
('20260923055939','20260919003500','standing_authorization_automation')
)
update supabase_migrations.schema_migrations s
set version=d.repository_version
from deployed d
where s.version=d.connector_version and s.name=d.migration_name
and not exists(select 1 from supabase_migrations.schema_migrations canonical where canonical.version=d.repository_version);

-- Hosted projects may install this administrative event trigger automatically.
-- It must remain available to its owner, not exposed as a client RPC.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public,anon,authenticated;
  end if;
end;
$$;

