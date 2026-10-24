import {readFile} from 'node:fs/promises';import test from 'node:test';import assert from 'node:assert/strict';
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8');
test('the completion checklist accounts for every current partially verified service',async()=>{
 const registry=JSON.parse(await read('src/registry/published-services.json')),checklist=JSON.parse(await read('qa/remaining-partial-services-2026-10-15.json'));
 const partial=registry.services.filter(s=>!s.verification.detailsVerified).map(s=>s.slug).sort();
 const tracked=checklist.services.map(s=>s.slug).sort();
 assert.equal(new Set(tracked).size,tracked.length);assert.deepEqual(tracked,partial);assert.equal(checklist.remaining,partial.length);
 const uaq=checklist.services.find(s=>s.slug==='umm-al-quwain-trade-name-official-path');assert.deepEqual(uaq.unverifiedFields,['fees','duration']);
});
