import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
const matrix=JSON.parse(await readFile(new URL('../../service-matrix.json',import.meta.url)));
test('MOFA requirements remain channel-specific in rebuilt Arabic and English pages',async()=>{
 for(const slug of ["تصديق-مستند-شخصي-داخل-الإمارات","تصديق-مستند-تجاري-دولي-عدا-الفاتورة-وشهادة-المنشأ"]){
  const s=matrix.services.find(x=>x.slug===slug),ar=await readFile(new URL('../../services/'+slug+'/index.html',import.meta.url),'utf8'),en=await readFile(new URL('../../en/services/'+slug+'/index.html',import.meta.url),'utf8');
  for(const value of [...s.requirements,s.conditions,s.duration])assert.ok(ar.includes(value));
  assert.match(en,/UAE-issued document of an eligible type/);
  assert.match(en,/not laminated/);assert.match(en,/1–3 working days/);
  assert.doesNotMatch(en,/An English translation is not yet available/);
 }
 const moe=await readFile(new URL('../../en/services/equivalency-of-general-education-certificate-in-the-uae-grade-12/index.html',import.meta.url),'utf8');
 assert.match(moe,/within 7 days; the Ministry contacts/);
 assert.doesNotMatch(moe,/within 7 days after three contact attempts/);
});
