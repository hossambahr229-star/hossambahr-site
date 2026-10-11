import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {stripTypeScriptTypes} from 'node:module';
import {detectJurisdiction,relationshipCompatibility,semanticDomainCompatibility} from '../../supabase/functions/public-ai-concierge/semantic-context.ts';
import {familyCandidate} from '../../supabase/functions/public-ai-concierge/family-candidates.ts';
test('Explicit Dubai real estate ad permits retain identity and reject neighboring operations',()=>{
 const source=fs.readFileSync(new URL('../../supabase/functions/public-ai-concierge/index.ts',import.meta.url),'utf8');
 const utilities=source.slice(source.indexOf('function normalize('),source.indexOf('type SemanticState'));
 const ranking=source.slice(source.indexOf('function specialBoost('),source.indexOf('async function selectSemanticCandidate'));
 const {rank,specialBoost,normalize}=Function('detectJurisdiction','relationshipCompatibility','semanticDomainCompatibility','familyCandidate',stripTypeScriptTypes(utilities+ranking,{mode:'strip'})+'return {rank,specialBoost,normalize};')(detectJurisdiction,relationshipCompatibility,semanticDomainCompatibility,familyCandidate);
 const published=JSON.parse(fs.readFileSync(new URL('../../src/registry/published-services.json',import.meta.url),'utf8')).services;
 const rows=published.map(s=>({title:s.name.ar,binding:{service_slug:s.slug,metadata:{name_en:s.name.en,category:s.classification.main}},authority:{authority_key:s.authority.id},jurisdiction:{code:s.emirate==='دبي'?'AE-DU':'AE'},haystack:[s.slug,s.name.ar,s.name.en,s.authority.ar,s.authority.en].join(' ')}));
 for(const prefix of ['تصريح إعلان عقاري من دائرة الأراضي والأملاك في دبي. ','Real Estate Ad Permit from Dubai Land Department. '])
 for(const question of ['ما الرسوم الحكومية؟','كم المدة؟','ما المستندات المطلوبة؟','ما الشروط؟','What are the government fees?','What is the processing time?','What documents are needed?','What are the conditions?']){
 const goal=prefix+question;assert.equal(rank(goal,rows,null,null)[0]?.binding.service_slug,'dld-real-estate-ad-permit-dubai',goal);
 }
 for(const goal of ['Cancel real estate ad permit in Dubai','Renew real estate ad permit in Dubai','تعديل تصريح إعلان عقاري في دبي','تصريح إعلان عقاري في أبوظبي','Real Estate Ad Permit in Sharjah','Real estate broker card in Dubai','Vehicle advertising permit from RTA Dubai','Property valuation in Dubai'])
 assert.equal(specialBoost(normalize(goal),'dld-real-estate-ad-permit-dubai','AE-DU'),0,goal);
});
