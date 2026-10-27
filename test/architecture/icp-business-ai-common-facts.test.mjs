import test from'node:test';import assert from'node:assert/strict';import fs from'node:fs';import{stripTypeScriptTypes}from'node:module';import{recordedDetailTranslations}from'../../src/publication/recorded-detail-translations.mjs';import{governmentActionHref}from'../../service-pathways.js';
const matrix=JSON.parse(fs.readFileSync(new URL('../../service-matrix.json',import.meta.url),'utf8')).services,s=matrix.find(x=>x.id==='directory:residency:36');
const source=fs.readFileSync(new URL('../../supabase/functions/public-ai-concierge/english-response.ts',import.meta.url),'utf8').replace(/^import .*recorded-fact-translations.ts';\n/,'').replaceAll('export function ','function ');
const {englishResult}=Function('recordedFactTranslations',stripTypeScriptTypes(source,{mode:'strip'})+'return{englishResult};')(recordedDetailTranslations);
test('new reviewed common facts have complete explanatory English without inventing missing fees',()=>{
 const match={service_slug:s.slug,service_name_en:'Business exploration visa',requirements:s.requirements,conditions:[s.conditions]};
 for(const [focus,value,expected]of[['documents','المتطلبات المسجلة',s.localizedDetails.en.documents[3]],['duration',s.duration,s.localizedDetails.en.duration],['conditions',s.conditions,s.localizedDetails.en.eligibility]]){
 const r=englishResult({matches:[match],answer:{focus,text:value,grounded:true,fact_status:'VERIFIED_FACT',evidence:{document_requirements:s.requirements}}});
 assert.ok(r.answer.text.includes(expected),focus);assert.doesNotMatch(r.answer.text,/Verified source record, in its original language/);
 }
 assert.match(englishResult({matches:[match],answer:{focus:'fees',fact_status:'MISSING_INFORMATION'}}).answer.text,/cannot confirm a government fee/);
});
test('only canonical and reviewed duration government actions go to the chooser',()=>{
 const data={service_slug:s.slug,name:s.name,official_url:s.officialCardUrl,official_variant_cards:s.officialVariantCards,service_url:s.internalUrl};
 for(const lang of['ar','en'])for(const url of[s.officialCardUrl,...s.officialVariantCards.map(c=>c.informationUrl)])assert.equal(governmentActionHref(data,url,lang),(lang==='en'?'/en':'')+s.internalUrl+'#official-variant-options');
 assert.equal(governmentActionHref(data,'https://icp.gov.ae/en/services-details/?serviceid=unreviewed'),null);
 assert.equal(governmentActionHref(data,'https://example.com/'),null);
 const ordinary=matrix.find(x=>x.slug==='family-residency-uae');assert.equal(governmentActionHref(ordinary,ordinary.officialCardUrl),null);
});
