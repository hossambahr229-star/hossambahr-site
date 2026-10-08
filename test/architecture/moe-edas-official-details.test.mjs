import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
const matrix=JSON.parse(await readFile(new URL('../../service-matrix.json',import.meta.url)));
const slugs=["attestation-of-commercial-invoices-via-edas-2-0","equivalency-of-general-education-certificate-from-abroad-grade-12","equivalency-of-general-education-certificate-in-the-uae-grade-12","confirming-the-authenticity-of-equivalency"];
test('MOE and eDAS official qualifications survive both rebuilt languages',async()=>{
 for(const slug of slugs){
  const source=matrix.services.find(s=>s.slug===slug),ar=await readFile(new URL('../../services/'+slug+'/index.html',import.meta.url),'utf8'),en=await readFile(new URL('../../en/services/'+slug+'/index.html',import.meta.url),'utf8');
  for(const detail of [...source.requirements,source.conditions,source.fees,source.duration])assert.ok(ar.includes(detail),slug+' Arabic source field omitted');
  assert.doesNotMatch(en,/An English translation is not yet available/);
  assert.doesNotMatch(en,/A verified detail is not available/);
  assert.match(en,/data-platform-detail-translation/);
 }
 const inside=await readFile(new URL('../../en/services/equivalency-of-general-education-certificate-in-the-uae-grade-12/index.html',import.meta.url),'utf8');
 const outside=await readFile(new URL('../../en/services/equivalency-of-general-education-certificate-from-abroad-grade-12/index.html',import.meta.url),'utf8');
 assert.match(inside,/competent local educational regulator/);assert.match(inside,/5 working days/);
 assert.match(outside,/attested by MoFA/);assert.match(outside,/3–30 working days/);
 assert.match(inside,/5 MB/);assert.match(outside,/5 MB/);
 const verification=await readFile(new URL('../../en/services/confirming-the-authenticity-of-equivalency/index.html',import.meta.url),'utf8');
 assert.match(verification,/only for electronic documents/);assert.match(verification,/2 MB/);
});
