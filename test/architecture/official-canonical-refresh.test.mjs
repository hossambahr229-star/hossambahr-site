import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const registry=JSON.parse(await readFile(new URL('../../src/registry/registry.json',import.meta.url)));
const review=JSON.parse(await readFile(new URL('../../content/canonical-official-field-review-2026-10-08.json',import.meta.url)));
test('official correction retains distinct DET and free-zone requirements',()=>{
 const service=registry.services.find(s=>s.id==='rta-new-trade-license-noc-dubai');
 assert.match(service.eligibility[0].en,/DET licence with inactive/);
 assert.match(service.eligibility[0].en,/free-zone initial approval/);
 const identity=service.documents.items.find(item=>item.id==='member-identity');
 assert.equal(identity.required,false);
 assert.match(identity.notes.en,/Free-zone members only/);
 assert.doesNotMatch(identity.notes.en,/sponsor NOC/);
});
test('DLD permits retain surcharge and exhibition-specific qualifications',()=>{
 const service=registry.services.find(s=>s.id==='dld-real-estate-ad-permit-dubai');
 assert.ok(service.governmentFees.items.every(item=>item.notes.en.includes('20')));
 assert.ok(service.documents.items.some(item=>item.id==='exhibition-participant-list'&&!item.required));
 assert.ok(service.conditions.some(item=>/30-day gap/.test(item.en)&&/Escrow Account Department/.test(item.en)));
});
test('partial source review never claims a fresh complete review of every catalog record',()=>{
 assert.equal(review.records.length,4);
 for(const row of review.records){
  const source=registry.services.find(s=>s.id===row.id);
  assert.ok(source);
  assert.equal(new URL(row.url).hostname.replace(/^www\./,''),new URL(source.officialGovernmentLink.url).hostname.replace(/^www\./,''));
  assert.ok(source.lastReviewedAt.startsWith('2026-08-'));
 }
});
