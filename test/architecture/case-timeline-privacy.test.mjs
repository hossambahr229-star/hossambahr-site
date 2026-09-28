import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root=resolve(import.meta.dirname,"../..");
const read=(path)=>readFile(resolve(root,path),"utf8");

test("case timeline reads only safe event metadata",async()=>{
  const client=await read("os-client.js");
  assert.match(client,/from\("hb_case_events"\)/);
  assert.match(client,/select\("id,case_id,event_type,actor_type,occurred_at"\)/);
  assert.doesNotMatch(client,/select\([^\n]*payload[^\n]*\)/);
  assert.match(client,/buildCaseTimeline/);
});

test("OS obligations include overdue items and still cap future horizon",async()=>{
  const client=await read("os-client.js");
  assert.match(client,/\.lte\("due_at",end\)/);
  assert.doesNotMatch(client,/\.gte\("due_at",start\)/);
  assert.match(client,/متأخر:/);
});
