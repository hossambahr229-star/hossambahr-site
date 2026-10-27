import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../../'+p,import.meta.url),'utf8');
const matrix=JSON.parse(read('service-matrix.json')).services, registry=JSON.parse(read('src/registry/published-services.json')).services;
const slug="تأشيرة-استكشاف-فرص-تأسيس-الأعمال-عبر-icp-خارج-دبي";
test('common ICP business facts survive both generated languages without certifying missing details',()=>{
 const s=matrix.find(x=>x.slug===slug),p=registry.find(x=>x.slug===slug);
 assert.equal(p.id,'directory:residency:36');
 assert.equal(p.verification.requirementsVerified,true);assert.equal(p.verification.durationVerified,true);
 assert.equal(p.verification.feesVerified,false);assert.equal(p.verification.eligibilityVerified,false);assert.equal(p.verification.detailsVerified,false);
 assert.equal(p.eligibilityScope,'common-only');assert.equal(s.fees,'غير موثق بعد');
 assert.equal(p.documents.items.length,6);assert.match(s.duration,/لم تحدد البطاقات أنهما يوما عمل/);assert.match(s.conditions,/مهلة دخول وليست مدة البقاء/);
 assert.deepEqual(s.executionChoices.map(x=>x.transactionId),[944,945,946]);assert.deepEqual(p.officialVariantCards.map(x=>x.durationDays),[60,90,120]);
 const ar=read('services/'+slug+'/index.html'),en=read('en/services/'+slug+'/index.html');
 for(const v of s.requirements)assert.ok(ar.includes(v),'Arabic document survives publication');
 for(const v of s.localizedDetails.en.documents)assert.ok(en.includes(v),'English document survives publication');
 assert.ok(ar.includes(s.duration));assert.ok(en.includes(s.localizedDetails.en.duration));assert.ok(en.includes('Common conditions'));assert.ok(en.includes('incompletely verified'));
});
test('business evidence does not populate job-exploration documents',()=>{
 const job=matrix.find(s=>s.id==='directory:residency:34');assert.ok(!job.requirements.some(x=>/مبدئية/.test(x)));
 const review=JSON.parse(read('content/icp-business-exploration-field-review-2026-10-27.json'));assert.deepEqual(review.records.map(x=>x.slug),[slug]);assert.equal(review.records[0].sourceUrls.length,3);
});
