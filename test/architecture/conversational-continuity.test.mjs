import test from "node:test";import assert from "node:assert/strict";import fs from "node:fs";
const src=fs.readFileSync(new URL("../../supabase/functions/public-ai-concierge/index.ts",import.meta.url),"utf8");
test("contextual follow-ups inherit the active catalog service before lexical ranking",()=>{
 assert.match(src,/isContextualFollowUp/);
 assert.match(src,/active_service_id/);
 assert.match(src,/inheritedServiceId/);
 assert.match(src,/catalog\.find\(\(row:any\)=>row\.binding\.service_slug===inheritedServiceId\)/);
 assert.match(src,/last_answer_topic/);assert.match(src,/pending_clarification/);assert.match(src,/known_facts/);
 for(const focus of["documents","conditions","fees","steps","duration","authority","approvals","link","start"])assert.ok(src.includes('"'+focus+'"'),focus);
});
