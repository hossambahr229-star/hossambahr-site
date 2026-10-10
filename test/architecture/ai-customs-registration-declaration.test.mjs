import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {stripTypeScriptTypes} from 'node:module';
import {detectJurisdiction,relationshipCompatibility,semanticDomainCompatibility} from '../../supabase/functions/public-ai-concierge/semantic-context.ts';
import {familyCandidate} from '../../supabase/functions/public-ai-concierge/family-candidates.ts';
test('Dubai Customs registration and declarations retain distinct original transaction identities',()=>{
 const source=fs.readFileSync(new URL('../../supabase/functions/public-ai-concierge/index.ts',import.meta.url),'utf8');
 const utilities=source.slice(source.indexOf('function normalize('),source.indexOf('type SemanticState'));
 const ranking=source.slice(source.indexOf('function specialBoost('),source.indexOf('async function selectSemanticCandidate'));
 const {rank,specialBoost}=Function('detectJurisdiction','relationshipCompatibility','semanticDomainCompatibility','familyCandidate',stripTypeScriptTypes(utilities+ranking,{mode:'strip'})+'return {rank,specialBoost};')(detectJurisdiction,relationshipCompatibility,semanticDomainCompatibility,familyCandidate);
 const published=JSON.parse(fs.readFileSync(new URL('../../src/registry/published-services.json',import.meta.url),'utf8')).services;
 const rows=published.map(s=>({title:s.name.ar,binding:{service_slug:s.slug,metadata:{name_en:s.name.en,category:s.classification.main}},authority:{authority_key:s.authority.id},jurisdiction:{code:s.emirate==='عجمان'?'AE-AJ':s.emirate==='دبي'?'AE-DU':'AE'},haystack:[s.slug,s.name.ar,s.name.en,s.authority.ar,s.authority.en].join(' ')}));
 for(const [prefix,slug] of [
 ['تسجيل منشأة لدى جمارك دبي. ','dubai-customs-business-registration'],
 ['Request Business Registration from Dubai Customs. ','dubai-customs-business-registration'],
 ['تقديم بيان جمركي في دبي. ','submit-customs-declaration-dubai'],
 ['Submit Customs Declaration from Dubai Customs. ','submit-customs-declaration-dubai']])
 for(const question of ['ما الرسوم الحكومية؟','كم المدة؟','What are the government fees?','What is the processing time?']){
  const goal=prefix+question,ranked=rank(goal,rows,null,null);assert.equal(ranked[0]?.binding.service_slug,slug,goal);assert.ok(ranked[0].score>=5000);
 }
 for(const goal of ['Business registration from Abu Dhabi Customs','Business registration in Dubai','أريد تسجيل رخصة تجارية في دبي','Cancel customs declaration in Dubai','تعديل بيان جمركي في دبي','Customs declaration in Sharjah','Vehicle clearance certificate from Dubai Customs'])
 for(const slug of ['dubai-customs-business-registration','submit-customs-declaration-dubai'])
 assert.equal(specialBoost(goal,slug,'AE-DU'),0,goal+' must not gain this original Customs transaction boost');
});
