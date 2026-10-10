import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {stripTypeScriptTypes} from 'node:module';
import {detectJurisdiction,relationshipCompatibility,semanticDomainCompatibility} from '../../supabase/functions/public-ai-concierge/semantic-context.ts';
import {familyCandidate} from '../../supabase/functions/public-ai-concierge/family-candidates.ts';
test('Ajman activity inquiries retain identity without selecting a licence application',()=>{
 const source=fs.readFileSync(new URL('../../supabase/functions/public-ai-concierge/index.ts',import.meta.url),'utf8');
 const utilities=source.slice(source.indexOf('function normalize('),source.indexOf('type SemanticState'));
 const ranking=source.slice(source.indexOf('function specialBoost('),source.indexOf('async function selectSemanticCandidate'));
 const {rank,specialBoost}=Function('detectJurisdiction','relationshipCompatibility','semanticDomainCompatibility','familyCandidate',stripTypeScriptTypes(utilities+ranking,{mode:'strip'})+'return {rank,specialBoost};')(detectJurisdiction,relationshipCompatibility,semanticDomainCompatibility,familyCandidate);
 const published=JSON.parse(fs.readFileSync(new URL('../../src/registry/published-services.json',import.meta.url),'utf8')).services;
 const rows=published.map(s=>({title:s.name.ar,binding:{service_slug:s.slug,metadata:{name_en:s.name.en,category:s.classification.main}},authority:{authority_key:s.authority.id},jurisdiction:{code:s.emirate==='عجمان'?'AE-AJ':s.emirate==='دبي'?'AE-DU':'AE'},haystack:[s.slug,s.name.ar,s.name.en,s.authority.ar,s.authority.en].join(' ')}));
 for(const prefix of ['الاستعلام عن الأنشطة الاقتصادية في عجمان. ','Business Activity Inquiry in Ajman. '])
 for(const question of ['ما الرسوم الحكومية؟','ما المستندات المطلوبة؟','What is the processing time?','What are the conditions?']){
  const goal=prefix+question,ranked=rank(goal,rows,null,null);assert.equal(ranked[0]?.binding.service_slug,'ajman-business-activity-inquiry',goal);assert.ok(ranked[0].score>=5000);
 }
 for(const goal of ['Business Activity Inquiry in Dubai','استعلام عن الأنشطة في الشارقة','I need a business licence in Ajman','أريد إصدار رخصة في عجمان','What are Ajman government fees?'])
 assert.equal(specialBoost(goal,'ajman-business-activity-inquiry','AE-AJ'),0,goal+' must not gain an inquiry boost');
});
