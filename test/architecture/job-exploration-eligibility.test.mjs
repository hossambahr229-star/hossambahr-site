import test from'node:test';import assert from'node:assert/strict';import{readFile}from'node:fs/promises';
test('job exploration keeps the statutory alternative pathways in both published languages',async()=>{
 const slug="تأشيرة-استكشاف-فرص-عمل-في-دبي",matrix=JSON.parse(await readFile(new URL('../../service-matrix.json',import.meta.url))),s=matrix.services.find(x=>x.slug===slug);
 const ar=await readFile(new URL('../../services/'+slug+'/index.html',import.meta.url),'utf8'),en=await readFile(new URL('../../en/services/'+slug+'/index.html',import.meta.url),'utf8');
 for(const value of [...s.requirements,s.conditions,s.fees,s.duration])assert.ok(ar.includes(value));
 assert.match(ar,/أحد مسارين/);assert.match(ar,/أو التخرج/);
 assert.match(en,/Meet either pathway/);assert.match(en,/or graduation from an approved top-500 university/);
 assert.match(en,/within the two years before applying/);assert.match(en,/Both pathways require a bachelor(?:'|&#39;)s degree or equivalent/);
 assert.match(en,/total may vary by case/);assert.match(en,/48 hours according to the service card/);
 assert.doesNotMatch(en,/An English translation is not yet available|48 working hours/);
});
