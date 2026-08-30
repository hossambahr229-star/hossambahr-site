import { readFile } from "node:fs/promises";
const configText = await readFile(new URL("../auth-config.js", import.meta.url), "utf8");
const publishableKey = configText.match(/publishableKey:\s*"([^"]+)"/)?.[1];
if (!publishableKey) throw new Error("Missing publishable key");
const base = "https://bbddlpvxjowphkagvycz.supabase.co";
const headers = { apikey: publishableKey, Authorization: `Bearer ${publishableKey}`, "Content-Type": "application/json" };
const health = await fetch(`${base}/auth/v1/health`, { headers });
const profiles = await fetch(`${base}/rest/v1/profiles?select=id`, { headers });
const profileRows = await profiles.json();
const transactions = await fetch(`${base}/rest/v1/user_transactions?select=id`, { headers });
const transactionRows = await transactions.json();
const anonymousInsert = await fetch(`${base}/rest/v1/user_transactions`, {
  method: "POST", headers: { ...headers, Prefer: "return=minimal" },
  body: JSON.stringify({ service_slug: "security-test", service_name: "security-test" })
});
const result = {
  authHealth: health.status,
  anonymousProfiles: { status: profiles.status, rows: Array.isArray(profileRows) ? profileRows.length : null },
  anonymousTransactions: { status: transactions.status, rows: Array.isArray(transactionRows) ? transactionRows.length : null },
  anonymousInsertStatus: anonymousInsert.status
};
console.log(JSON.stringify(result));
const protectedRead = (status, rows) => status === 401 || (status === 200 && rows === 0);
if (health.status !== 200 || !protectedRead(profiles.status, result.anonymousProfiles.rows) || !protectedRead(transactions.status, result.anonymousTransactions.rows) || ![401, 403].includes(anonymousInsert.status)) process.exit(1);
