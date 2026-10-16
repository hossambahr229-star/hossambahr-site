import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const matrix=JSON.parse(fs.readFileSync(new URL('../../service-matrix.json',import.meta.url),'utf8')).services;
const registry=JSON.parse(fs.readFileSync(new URL('../../src/registry/published-services.json',import.meta.url),'utf8')).services;
const review=JSON.parse(fs.readFileSync(new URL('../../content/icp-reports-fines-field-review-2026-10-16.json',import.meta.url),'utf8'));
test('ICP fees and eligibility survive AR and EN publication while unknown fields remain partial',()=>{
 for(const {slug} of review.records){const s=matrix.find(x=>x.slug===slug),p=registry.find(x=>x.slug===slug);assert.equal(s.lastReviewed,'2026-10-16');assert.equal(s.loginRequired,true);assert.equal(p.governmentFees.text,s.fees);assert.ok(s.localizedDetails.en.fees);assert.ok(s.localizedDetails.en.eligibility);assert.equal(s.requirements.length,0);assert.equal(s.duration,'غير موثق بعد');
 const ar=fs.readFileSync(new URL('../../services/'+slug+'/index.html',import.meta.url),'utf8');assert.ok(ar.includes(s.fees));assert.ok(ar.includes(s.conditions));
 const en=fs.readFileSync(new URL('../../en/services/'+slug+'/index.html',import.meta.url),'utf8');assert.ok(en.includes(s.localizedDetails.en.fees));assert.ok(en.includes(s.localizedDetails.en.eligibility));
 assert.ok(p.steps.every(x=>x.title));}
 assert.equal(review.completed.length,0);assert.equal(review.remainingPartialCount,32);
 const fine=matrix.find(x=>x.slug==='سداد-غرامة-مخالفة-تأشيرة-أو-إقامة-عبر-icp-خارج-دبي');assert.match(fine.fees,/ليست مجموعًا ثابتًا/);assert.match(fine.fees,/2000/);assert.match(fine.specialCases,/N\/A/);assert.equal(registry.find(x=>x.slug===fine.slug).steps.length,3,'Do not pad the three official steps with invented steps');
});
