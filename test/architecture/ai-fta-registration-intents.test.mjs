import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {stripTypeScriptTypes} from 'node:module';
import {detectJurisdiction,relationshipCompatibility,semanticDomainCompatibility} from '../../supabase/functions/public-ai-concierge/semantic-context.ts';
import {familyCandidate} from '../../supabase/functions/public-ai-concierge/family-candidates.ts';
test('FTA registration identities resolve with scoped tax object and operation',()=>{
 const source=fs.readFileSync(new URL('../../supabase/functions/public-ai-concierge/index.ts',import.meta.url),'utf8');
 const utilities=source.slice(source.indexOf('function normalize('),source.indexOf('type SemanticState'));
 const ranking=source.slice(source.indexOf('function specialBoost('),source.indexOf('async function selectSemanticCandidate'));
 const {rank,specialBoost,normalize}=Function('detectJurisdiction','relationshipCompatibility','semanticDomainCompatibility','familyCandidate',stripTypeScriptTypes(utilities+ranking,{mode:'strip'})+'return {rank,specialBoost,normalize};')(detectJurisdiction,relationshipCompatibility,semanticDomainCompatibility,familyCandidate);
 const published=JSON.parse(fs.readFileSync(new URL('../../src/registry/published-services.json',import.meta.url),'utf8')).services;
 const rows=published.map(s=>({title:s.name.ar,binding:{service_slug:s.slug,metadata:{name_en:s.name.en,category:s.classification.main}},authority:{authority_key:s.authority.id},jurisdiction:{code:s.emirate==='دبي'?'AE-DU':'AE'},haystack:[s.slug,s.name.ar,s.name.en,s.authority.ar,s.authority.en].join(' ')}));

 for(const [label,slug]of [['التسجيل في ضريبة الشركات بالإمارات','corporate-tax-registration-uae'],['Corporate Tax Registration with the UAE Federal Tax Authority','corporate-tax-registration-uae'],['التسجيل في ضريبة القيمة المضافة بالإمارات','vat-registration-uae'],['VAT Registration with the UAE Federal Tax Authority','vat-registration-uae']]){
 for(const focus of ['ما الرسوم الحكومية؟','كم المدة؟','What are the government fees?','What is the processing time?']){
 const goal=label+'. '+focus;const ranked=rank(goal,rows,null,null);assert.equal(ranked[0]?.binding.service_slug,slug,goal);assert.ok(ranked[0].score>=5000);
 }}
 for(const goal of ['Cancel UAE VAT registration','Amend UAE corporate tax registration','FTA corporate tax return registration','UAE VAT refund registration','إلغاء التسجيل في ضريبة الشركات بالإمارات','تعديل التسجيل في ضريبة القيمة المضافة بالإمارات','تسجيل شركة في الإمارات','VAT Registration in Saudi Arabia'])
 for(const slug of ['corporate-tax-registration-uae','vat-registration-uae'])assert.equal(specialBoost(normalize(goal),slug,'AE'),0,goal);
 assert.equal(specialBoost(normalize('UAE VAT Registration'),'corporate-tax-registration-uae','AE'),0);
 assert.equal(specialBoost(normalize('UAE Corporate Tax Registration'),'vat-registration-uae','AE'),0);
});
