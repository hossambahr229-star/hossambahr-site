-- pg_net is non-relocatable in this project. Reduce exposure without dropping or moving the extension.
-- The sole application caller is a postgres-owned SECURITY DEFINER worker function.
revoke usage on schema net from public, anon, authenticated;
revoke execute on all functions in schema net from public, anon, authenticated;
