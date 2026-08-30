import { readFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!secret) throw new Error("SUPABASE_SERVICE_ROLE_KEY is required");
const configText = await readFile(new URL("../auth-config.js", import.meta.url), "utf8");
const publishableKey = configText.match(/publishableKey:\s*"([^"]+)"/)?.[1];
const base = "https://bbddlpvxjowphkagvycz.supabase.co";
const suffix = `${Date.now()}-${randomBytes(3).toString("hex")}`;
const email = `phase2-smoke-${suffix}@example.com`;
const password = `Hb-${randomBytes(10).toString("base64url")}9`;
const adminHeaders = { apikey: secret, Authorization: `Bearer ${secret}`, "Content-Type": "application/json" };
const publicHeaders = { apikey: publishableKey, "Content-Type": "application/json" };
let userId;
try {
  const created = await fetch(`${base}/auth/v1/admin/users`, { method: "POST", headers: adminHeaders, body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { display_name: "Phase 2 Security Test" } }) });
  const createdBody = await created.json();
  if (created.status !== 200) throw new Error(`admin create failed ${created.status}`);
  userId = createdBody.id;
  const signedIn = await fetch(`${base}/auth/v1/token?grant_type=password`, { method: "POST", headers: publicHeaders, body: JSON.stringify({ email, password }) });
  const auth = await signedIn.json();
  if (signedIn.status !== 200 || !auth.access_token || !auth.refresh_token) throw new Error(`sign in failed ${signedIn.status}`);
  const userHeaders = { apikey: publishableKey, Authorization: `Bearer ${auth.access_token}`, "Content-Type": "application/json" };
  const profile = await fetch(`${base}/rest/v1/profiles?id=eq.${userId}&select=id,display_name`, { headers: userHeaders });
  const profiles = await profile.json();
  if (profile.status !== 200 || profiles.length !== 1 || profiles[0].id !== userId) throw new Error("profile RLS/trigger failed");
  const inserted = await fetch(`${base}/rest/v1/user_transactions`, { method: "POST", headers: { ...userHeaders, Prefer: "return=representation" }, body: JSON.stringify({ user_id: userId, service_slug: "phase2-security-test", service_name: "Phase 2 Security Test", status: "saved" }) });
  const rows = await inserted.json();
  if (![200, 201].includes(inserted.status) || rows.length !== 1) throw new Error(`transaction insert failed ${inserted.status}`);
  const refreshed = await fetch(`${base}/auth/v1/token?grant_type=refresh_token`, { method: "POST", headers: publicHeaders, body: JSON.stringify({ refresh_token: auth.refresh_token }) });
  const refreshBody = await refreshed.json();
  if (refreshed.status !== 200 || !refreshBody.access_token) throw new Error("session refresh failed");
  const loggedOut = await fetch(`${base}/auth/v1/logout`, { method: "POST", headers: { apikey: publishableKey, Authorization: `Bearer ${refreshBody.access_token}` } });
  if (![200, 204].includes(loggedOut.status)) throw new Error(`logout failed ${loggedOut.status}`);
  console.log(JSON.stringify({ create: "PASS", signIn: "PASS", emailConfirmed: true, profileTrigger: "PASS", rlsOwnData: "PASS", sessionRefresh: "PASS", logout: "PASS", cleanup: "PENDING" }));
} finally {
  if (userId) {
    const removed = await fetch(`${base}/auth/v1/admin/users/${userId}`, { method: "DELETE", headers: adminHeaders });
    if (![200, 204].includes(removed.status)) throw new Error(`cleanup failed ${removed.status}`);
    console.log(JSON.stringify({ cleanup: "PASS" }));
  }
}
