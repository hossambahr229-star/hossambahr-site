import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root=resolve(import.meta.dirname,"../..");
const read=(path)=>readFile(resolve(root,path),"utf8");

test("Action Inbox is authenticated and priority-ranked server-side",async()=>{
  const migration=await read("supabase/migrations/20260928065000_unified_action_inbox.sql");
  assert.match(migration,/hb_my_action_inbox/);
  assert.match(migration,/revoke all on function public\.hb_my_action_inbox\(integer\) from public,anon/);
  assert.match(migration,/priority_score desc/);
  assert.match(migration,/owner_external_execution/);
  assert.match(migration,/owner_internal_review/);
});

test("OS consumes the Action Inbox without duplicating private event payloads",async()=>{
  const client=await read("os-client.js");
  assert.match(client,/rpc\("hb_my_action_inbox"/);
  assert.match(client,/buildInboxItem/);
  assert.match(client,/hb_notifications/);
  assert.doesNotMatch(client,/hb_case_events[^\n]*payload/);
});
