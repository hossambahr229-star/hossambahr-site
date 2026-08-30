import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const text = (path) => readFile(new URL(`../../${path}`, import.meta.url), "utf8");
test("authentication uses the production project and a publishable key", async () => {
  const config = await text("auth-config.js");
  assert.match(config, /bbddlpvxjowphkagvycz\.supabase\.co/);
  assert.doesNotMatch(config, /__SUPABASE_PUBLISHABLE_KEY__/);
  assert.doesNotMatch(config, /service_role|sb_secret_/i);
});
test("required production auth routes are present", async () => {
  for (const route of ["auth/index.html", "auth/callback/index.html", "auth/reset/index.html", "account/index.html"]) { const html = await text(route); assert.match(html, /charset="utf-8"/i); assert.match(html, /zero-defect-routing\.js/); }
});
test("client implements the complete email and password lifecycle", async () => {
  const client = await text("auth-client.js");
  for (const capability of ["signUp", "signInWithPassword", "signOut", "resetPasswordForEmail", "updateUser", "exchangeCodeForSession", "getSession", "onAuthStateChange"]) assert.match(client, new RegExp(capability));
  assert.match(client, /persistSession:\s*true/); assert.match(client, /autoRefreshToken:\s*true/); assert.match(client, /detectSessionInUrl:\s*true/);
});
test("RLS migration protects profiles and transactions", async () => {
  const migration = await text("supabase/migrations/20260829010000_auth_profiles_and_transactions.sql");
  assert.match(migration, /alter table public\.profiles enable row level security/i); assert.match(migration, /alter table public\.user_transactions enable row level security/i); assert.match(migration, /auth\.uid\(\)/i); assert.doesNotMatch(migration, /using\s*\(\s*true\s*\)/i); assert.match(migration, /revoke all on public\.profiles from anon/i);
});
