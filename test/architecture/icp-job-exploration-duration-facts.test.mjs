import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync}from'node:fs';
const read=p=>readFileSync(new URL('../../'+p,import.meta.url),'utf8');
const matrix=JSON.parse(read('service-matrix.json')).services;
const slug='تأشيرة-استكشاف-فرص-عمل-عبر-icp-خارج-دبي';
test('job exploration publishes only the consistently documented processing time',()=>{
 const row=matrix.find(s=>s.slug===slug);assert.equal(row.id,'directory:residency:34');
 assert.match(row.duration,/يومان \(2\)/);assert.match(row.duration,/لم تحدد البطاقات أنهما يوما عمل/);
 assert.equal(row.faq.find(f=>f.question==='كم تستغرق المعاملة؟').answer,row.duration);
 assert.deepEqual(row.requirements,[]);assert.equal(row.fees,'غير موثق بعد');assert.equal(row.conditions,'غير موثق بعد');
 assert.deepEqual(row.executionChoices.map(c=>c.transactionId),[939,941,942]);assert.deepEqual(row.officialVariantCards.map(c=>c.durationDays),[60,90,120]);
 const review=JSON.parse(read('content/icp-job-exploration-field-review-2026-10-28.json')).records[0];
 assert.deepEqual(review.fields,['duration','specialCases']);assert.deepEqual(review.sourceUrls,row.officialVariantCards.map(c=>c.informationUrl));
 assert.match(row.localizedDetails.en.notes,/remain unverified/);assert.match(row.localizedDetails.en.duration,/working days are not specified/);
});
test('generated registry and both language pages retain partial status and reviewed duration',()=>{
 const row=JSON.parse(read('src/registry/published-services.json')).services.find(s=>s.slug===slug);
 assert.equal(row.verification.durationVerified,true);
 for(const flag of ['requirementsVerified','feesVerified','eligibilityVerified','detailsVerified'])assert.equal(row.verification[flag],false,flag);
 assert.equal(row.documents.items.length,0);
 const source=matrix.find(s=>s.slug===slug),ar=read('services/'+slug+'/index.html'),en=read('en/services/'+slug+'/index.html');
 assert.ok(ar.includes(source.duration));assert.ok(en.includes(source.localizedDetails.en.duration));assert.ok(en.includes('remain unverified'));
 assert.deepEqual(row.officialVariantCards,source.officialVariantCards);
});
