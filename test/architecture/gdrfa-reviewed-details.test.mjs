import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
const matrix=JSON.parse(await readFile(new URL('../../service-matrix.json',import.meta.url)));
test('reviewed GDRFA facts survive rebuilt Arabic and English pages with scoped qualifications',async()=>{
 for(const slug of ["إصدار-إقامة-موظف-في-القطاع-الخاص-في-دبي","إصدار-إقامة-للوالدين-ضمن-الحالات-الإنسانية-في-دبي"]){
  const s=matrix.services.find(x=>x.slug===slug);
  const ar=await readFile(new URL('../../services/'+slug+'/index.html',import.meta.url),'utf8');
  const en=await readFile(new URL('../../en/services/'+slug+'/index.html',import.meta.url),'utf8');
  for(const value of [...s.requirements,s.conditions,s.fees,s.duration])assert.ok(ar.includes(value),slug+': '+value);
  assert.doesNotMatch(en,/An English translation is not yet available/);
  assert.match(en,/AED 500 for an application from inside the UAE/);
  assert.equal(s.loginRequired,true);
  if(slug.includes('للوالدين')){
   assert.match(en,/minimum salary of AED 10,000/);
   assert.match(en,/AED 5,000 per request/);assert.match(en,/not exceeding AED 15,000/);
   assert.match(en,/14 days according to the service card/);
   assert.doesNotMatch(en,/refundable|14 working days/i);
  }else{
   assert.match(en,/over 18 years of age/);
   assert.match(en,/48 hours according to the service card/);
   assert.doesNotMatch(en,/48 working hours/i);
  }
 }
});
