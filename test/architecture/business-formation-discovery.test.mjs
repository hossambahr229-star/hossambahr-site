import test from 'node:test';import assert from 'node:assert/strict';import{readFile}from'node:fs/promises';import{discoverServices,businessFormationIntent,formationService}from'../../transaction-discovery.js';import{compatibleEmirate}from'../../customer-jurisdiction.js';
const records=JSON.parse(await readFile(new URL('../../transaction-discovery-data.json',import.meta.url),'utf8'));
test('Technical-services formation returns formation paths, not every Dubai transaction',()=>{
 const result=discoverServices(records,{query:'عاوز أفتح شركة خدمات فنية في دبي'});
 assert.equal(result[0]?.s,'issue-trade-license-dubai');assert.ok(result.length<10);assert.ok(result.every(s=>formationService(s)&&compatibleEmirate(s.m,'دبي')));assert.ok(result.every(s=>s.i!=='sira-dubai'));
});
test('Formation intent preserves all seven emirates without routing to a different emirate',()=>{
 for(const emirate of['دبي','أبوظبي','الشارقة','عجمان','رأس الخيمة','الفجيرة','أم القيوين']){
  const result=discoverServices(records,{query:'عايز أفتح شركة في '+emirate});assert.ok(result.length,emirate);assert.ok(result.every(s=>formationService(s)&&compatibleEmirate(s.m,emirate)),emirate);
 }
});
test('English activity idea respects Sharjah and explicit free-zone choice',()=>{
 const result=discoverServices(records,{query:'Start a technical services company in Sharjah'});assert.ok(result.some(s=>s.s==='sharjah-economic-license-issuance'));assert.ok(result.every(s=>compatibleEmirate(s.m,'الشارقة')));
 const zone=discoverServices(records,{query:'تأسيس شركة في المنطقة الحرة بالفجيرة'});assert.ok(zone.length);assert.ok(zone.every(s=>/free zone/i.test(s.e)||/الحرة/.test(s.a)));
});
test('Renewal, cancellation, SIRA, quota and establishment-file requests keep their existing intent',()=>{
 for(const query of['إلغاء مؤسسة فردية في دبي','تجديد إقامة مراتي','محتاج كوته عمال','موافقة سيرا للأنشطة الأمنية','عايز أفتح ملف شركة','Open an establishment file for my company'])assert.equal(businessFormationIntent(query),false,query);
 const sira=discoverServices(records,{query:'موافقة سيرا للأنشطة الأمنية'});assert.ok(sira.length);assert.ok(sira.every(s=>s.i==='sira-dubai'));
});
