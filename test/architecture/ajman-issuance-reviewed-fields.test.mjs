import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
test('Ajman issuance facts retain conditional fees, distinct execution and honest eligibility',()=>{
const slug='تأسيس-منشأة-جديدة-في-عجمان',matrix=read('service-matrix.json').services.find(s=>s.slug===slug),pub=read('src/registry/published-services.json').services.find(s=>s.slug===slug);
assert.equal(pub.verification.requirementsVerified,true);assert.equal(pub.verification.feesVerified,true);assert.equal(pub.verification.durationVerified,true);assert.equal(pub.verification.eligibilityVerified,false);assert.equal(pub.verification.detailsVerified,false);
assert.equal(pub.officialInformationUrl,'https://media.ajman.ae/ar/servicecatalog/services/2862');assert.match(pub.officialCtaUrl,/ReturnUrl=%2Fen%2Fnewestablishment/);assert.match(matrix.fees,/ليست مجموعًا/);assert.match(matrix.localizedDetails.en.fees,/not a combined total/);assert.match(matrix.duration,/ليست مدة تأسيس/);
assert.deepEqual(read('qa/remaining-partial-services-2026-10-15.json').services.find(s=>s.slug===slug).unverifiedFields,['eligibility']);
for(const locale of ['ar','en']){const html=fs.readFileSync((locale==='en'?'en/':'')+'services/'+slug+'/index.html','utf8');const d=locale==='en'?matrix.localizedDetails.en:{documents:matrix.requirements,fees:matrix.fees,duration:matrix.duration};for(const text of [...d.documents,d.fees,d.duration])assert.ok(html.includes(text),locale+' full reviewed field');assert.ok(html.includes('971503780460'));assert.ok(html.includes('newestablishment'));}
});
