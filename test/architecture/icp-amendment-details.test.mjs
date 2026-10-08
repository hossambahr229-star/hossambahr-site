import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const matrix=JSON.parse(await readFile(new URL('../../service-matrix.json',import.meta.url)));
const registry=JSON.parse(await readFile(new URL('../../src/registry/published-services.json',import.meta.url)));
test('ICP amendment records keep separate identity and category-dependent documents',async()=>{
 for(const slug of ['amendment-of-visa-data','amendment-of-residency-permit-data']){
  const source=matrix.services.find(s=>s.slug===slug),row=registry.services.find(s=>s.slug===slug);
  assert.equal(source.loginRequired,true);
  assert.equal(source.lastReviewed,'2026-10-08');
  assert.ok(source.requirements.includes('جواز السفر'));
  assert.ok(source.requirements.includes('صورة شخصية'));
  assert.equal(row.verification.requirementsVerified,true);
  assert.equal(row.verification.durationVerified,true);
  assert.equal(row.verification.feesVerified,true);
  const ar=await readFile(new URL('../../services/'+slug+'/index.html',import.meta.url),'utf8');
  for(const detail of [...source.requirements,source.fees,source.duration,source.conditions])assert.ok(ar.includes(detail),'Arabic generated page must retain '+detail);
  assert.doesNotMatch(ar,/غير موثق في سجل الكتالوج/);
  const en=await readFile(new URL('../../en/services/'+slug+'/index.html',import.meta.url),'utf8');
  assert.match(en,/Passport/);assert.match(en,/Personal photo/);assert.match(en,/UAE Pass/);
  assert.doesNotMatch(en,/An English translation is not yet available/);
 }
 const residence=matrix.services.find(s=>s.slug==='amendment-of-residency-permit-data');
 assert.match(residence.fees,/150/);assert.match(residence.fees,/100/);
 assert.match(residence.requirements.join(' '),/عند تغيير المهنة/);
 assert.notEqual(residence.officialCardUrl,matrix.services.find(s=>s.slug==='amendment-of-visa-data').officialCardUrl);
});
