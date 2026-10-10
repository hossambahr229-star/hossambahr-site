import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {stripTypeScriptTypes} from 'node:module';
import {detectJurisdiction,relationshipCompatibility,semanticDomainCompatibility} from '../../supabase/functions/public-ai-concierge/semantic-context.ts';
import {familyCandidate} from '../../supabase/functions/public-ai-concierge/family-candidates.ts';
test('Dubai Customs vehicle certificates retain identity without other vehicle or goods services',()=>{
 const source=fs.readFileSync(new URL('../../supabase/functions/public-ai-concierge/index.ts',import.meta.url),'utf8');
 const utilities=source.slice(source.indexOf('function normalize('),source.indexOf('type SemanticState'));
 const ranking=source.slice(source.indexOf('function specialBoost('),source.indexOf('async function selectSemanticCandidate'));
 const {rank,specialBoost}=Function('detectJurisdiction','relationshipCompatibility','semanticDomainCompatibility','familyCandidate',stripTypeScriptTypes(utilities+ranking,{mode:'strip'})+'return {rank,specialBoost};')(detectJurisdiction,relationshipCompatibility,semanticDomainCompatibility,familyCandidate);
 const published=JSON.parse(fs.readFileSync(new URL('../../src/registry/published-services.json',import.meta.url),'utf8')).services;
 const rows=published.map(s=>({title:s.name.ar,binding:{service_slug:s.slug,metadata:{name_en:s.name.en,category:s.classification.main}},authority:{authority_key:s.authority.id},jurisdiction:{code:s.emirate==='عجمان'?'AE-AJ':s.emirate==='دبي'?'AE-DU':'AE'},haystack:[s.slug,s.name.ar,s.name.en,s.authority.ar,s.authority.en].join(' ')}));
 for(const prefix of ['شهادة تخليص مركبة من جمارك دبي. ','Request Vehicle Clearance Certificate from Dubai Customs. '])
 for(const question of ['ما الرسوم الحكومية؟','كم المدة؟','What are the government fees?','What is the processing time?']){
  const goal=prefix+question,ranked=rank(goal,rows,null,null);assert.equal(ranked[0]?.binding.service_slug,'vehicle-clearance-certificate-dubai-customs',goal);assert.ok(ranked[0].score>=5000);
 }
 for(const goal of ['Vehicle Clearance Certificate from Abu Dhabi Customs','شهادة تخليص مركبة من جمارك الشارقة','Vehicle clearance certificate from RTA in Dubai','Goods clearance from Dubai Customs','أريد تجديد مركبة في دبي'])
 assert.equal(specialBoost(goal,'vehicle-clearance-certificate-dubai-customs','AE-DU'),0,goal+' must not gain a Dubai Customs vehicle-certificate boost');
});
