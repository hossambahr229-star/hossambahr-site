import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../../supabase/functions/public-ai-concierge/index.ts',import.meta.url),'utf8');
test('public AI excludes historical-only bindings while keeping English discovery metadata',()=>{
 const filter=source.match(/filter\(\(row:any\) => (row.safeSources.length > 0[^;]+)\);/);assert.ok(filter);
 const allowed=Function('row','return '+filter[1]);
 assert.equal(allowed({safeSources:[{}],binding:{metadata:{public_catalog:false}}}),false);
 assert.equal(allowed({safeSources:[{}],binding:{metadata:{public_catalog:true}}}),true);
 assert.equal(allowed({safeSources:[],binding:{metadata:{public_catalog:true}}}),false);
 assert.ok(source.includes('binding.metadata?.name_en,authority?.name_ar'));
 assert.ok(source.includes('service_name_en: row.binding.metadata?.name_en || null'));
});

test("manually reverified monitored sources remain eligible for public AI catalog",()=>{assert.match(edge,/7 \* 24 \* 60 \* 60 \* 1000/);assert.match(edge,/OFFICIAL_LINK_AND_DETAILS_VERIFIED/);assert.match(edge,/source\.review_required/);assert.match(edge,/monitor_failures/);});
