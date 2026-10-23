import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const review=read('content/det-commercial-permit-time-review-2026-10-23.json');
test('DET commercial-permit time survives AR/EN generators without verifying missing fields',()=>{
 const item=review.records[0];
 const source=read('content/government-service-tree.json').services.find(x=>x.id===item.sourceId);
 const reg=read('src/registry/published-services.json').services.find(x=>x.slug===item.slug);
 assert.equal(source.duration,item.durationAr);
 assert.equal(reg.processingTime.text,item.durationAr);
 assert.equal(reg.verification.durationVerified,true);
 for(const field of ['requirementsVerified','feesVerified','eligibilityVerified','detailsVerified']) assert.equal(reg.verification[field],false,field);
 assert.equal(reg.verification.verifiedDetailCount,1);
 assert.equal(reg.documents.items.length,0);
 const pending=read('qa/remaining-partial-services-2026-10-15.json');
 assert.equal(pending.remaining,32);
 assert.deepEqual(pending.services.find(x=>x.slug===item.slug).unverifiedFields,['documents','fees','eligibility']);
 for(const [prefix,text] of [['',item.durationAr],['en/',item.durationEn]]){
 const html=fs.readFileSync(prefix+'services/'+item.slug+'/index.html','utf8');
 assert.ok(html.includes(text),prefix+' service must render the reviewed time');
 assert.ok(html.includes('971503780460'),'assisted path retained');
 assert.ok(html.includes('request-to-issue-commercial-permit'),'government path retained');
 }
 assert.deepEqual(review.completed,[]);
});
