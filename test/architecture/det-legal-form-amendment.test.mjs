import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
test('legal-form amendment retains conditional official documents and time without inventing fees',()=>{
 const review=read('content/det-legal-form-amendment-review-2026-10-24.json'),item=review.records[0];
 const source=read('content/government-service-tree.json').services.find(s=>s.id===item.sourceId);
 const record=read('src/registry/published-services.json').services.find(s=>s.slug===item.slug);
 assert.deepEqual(source.requirements,item.documents.map(d=>d[0]));
 assert.equal(record.verification.requirementsVerified,true);
 assert.equal(record.verification.durationVerified,true);
 assert.equal(record.verification.feesVerified,false);
 assert.equal(record.verification.detailsVerified,false);
 assert.equal(record.lastReviewedAt,'2026-10-24');
 const pending=read('qa/remaining-partial-services-2026-10-15.json');
 assert.equal(pending.remaining,32);
 assert.deepEqual(pending.services.find(s=>s.slug===item.slug).unverifiedFields,['fees']);
 for(const p of ['', 'en/']){
  const html=fs.readFileSync(p+'services/'+item.slug+'/index.html','utf8');
  for(const pair of item.documents)assert.ok(html.includes(pair[p?1:0]),'conditional document in '+p);
  assert.ok(html.includes(p?item.durationEn:item.durationAr));
  assert.ok(html.includes('971503780460'));
  assert.ok(html.includes('request-to-amend-trade-licence'));
 }
 assert.deepEqual(review.completed,[]);
});
