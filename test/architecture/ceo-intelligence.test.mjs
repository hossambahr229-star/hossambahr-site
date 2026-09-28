import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root=resolve(import.meta.dirname,"../..");
const read=(path)=>readFile(resolve(root,path),"utf8");

test("CEO Intelligence is platform-owner gated and tenant scoped",async()=>{
  const migration=await read("supabase/migrations/20260928072000_owner_executive_intelligence.sql");
  assert.match(migration,/hb_private\.is_platform_owner\(\)/);
  assert.match(migration,/tenant_key=p_tenant_key/);
  assert.match(migration,/revoke all on function public\.hb_owner_executive_snapshot\(text\) from public,anon/);
  assert.match(migration,/top_services_30d/);
  assert.match(migration,/quote_pipeline_by_currency/);
});

test("owner dashboard exposes aggregate business intelligence without person rankings",async()=>{
  const [html,client]=await Promise.all([
    read("owner/index.html"),
    read("owner-client.js")
  ]);
  assert.match(html,/CEO Intelligence/);
  assert.match(client,/hb_owner_executive_snapshot/);
  assert.match(client,/renderMoneyRows/);
  assert.match(client,/renderIntelRows/);
  assert.doesNotMatch(client,/employee_rank|staff_rank|partner_rank|score_employee/);
});
