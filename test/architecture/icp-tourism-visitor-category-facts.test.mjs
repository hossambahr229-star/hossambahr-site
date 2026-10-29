import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync}from'node:fs';import{recordedDetailTranslations}from'../../src/publication/recorded-detail-translations.mjs';
const matrix=JSON.parse(readFileSync(new URL('../../service-matrix.json',import.meta.url),'utf8'));
const tour=matrix.services.find(s=>s.slug==='تأشيرة-سياحية-عبر-icp-خارج-دبي'),visit=matrix.services.find(s=>s.slug==='تأشيرة-زيارة-قريب-أو-صديق-عبر-icp-خارج-دبي');
test('tourism uses its selected category, not residence or treatment documents',()=>{
 assert.deepEqual(tour.requirements,['جواز سفر.','صورة شخصية.','بيان البرنامج السياحي.']);
 assert.doesNotMatch(tour.requirements.join(' '),/طبي|قرابه|قرابة|تقاعد|عقار|عقد عمل/);
 assert.match(tour.conditions,/المنشآت السياحية/);assert.match(tour.conditions,/120/);assert.match(tour.specialCases,/تتعارض/);assert.match(tour.specialCases,/5 سنوات/);
});
test('fees keep per-month alternatives and security separate without a fabricated total',()=>{
 for(const row of[tour,visit]){assert.match(row.fees,/100 عن كل شهر أو دخول متعدد 200 عن كل شهر/);assert.match(row.fees,/1000.*2000.*20/);assert.match(row.fees,/الضمان منفصل عن الرسوم/);assert.match(row.fees,/لا تشمل رسوم حسام بحر/);assert.match(row.duration,/لا تحدد البطاقة أنها أيام عمل/);assert.equal(row.lastReviewed,'2026-10-29');}
 assert.deepEqual(visit.requirements,[]);assert.equal(visit.conditions,'غير موثق بعد');
});
test('new facts have explanatory English translations with all numeric facts retained',()=>{
 for(const row of[tour,visit])for(const field of ['requirements','fees','duration','conditions','specialCases'])for(const value of Array.isArray(row[field])?row[field]:[row[field]])if(value&&value!=='غير موثق بعد'){
  const en=recordedDetailTranslations[value];assert.ok(en,row.slug+' '+field);assert.doesNotMatch(en,/[\u0600-\u06ff]/);assert.deepEqual(en.match(/\d+(?:,\d{3})*(?:\.\d+)?/g)?.map(x=>x.replaceAll(',',''))||[],value.match(/\d+(?:,\d{3})*(?:\.\d+)?/g)?.map(x=>x.replaceAll(',',''))||[]);
 }
});
