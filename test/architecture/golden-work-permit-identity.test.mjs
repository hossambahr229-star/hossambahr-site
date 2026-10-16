import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {stripTypeScriptTypes} from 'node:module';
import {detectJurisdiction,relationshipCompatibility,semanticDomainCompatibility} from '../../supabase/functions/public-ai-concierge/semantic-context.ts';
import {familyCandidate} from '../../supabase/functions/public-ai-concierge/family-candidates.ts';
test('Golden Residence employment permits never become residence applications',()=>{
 const source=fs.readFileSync(new URL('../../supabase/functions/public-ai-concierge/index.ts',import.meta.url),'utf8');
 const utilities=source.slice(source.indexOf('function normalize('),source.indexOf('type SemanticState'));
 const ranking=source.slice(source.indexOf('function specialBoost('),source.indexOf('async function selectSemanticCandidate'));
 const rank=Function('detectJurisdiction','relationshipCompatibility','semanticDomainCompatibility','familyCandidate',stripTypeScriptTypes(utilities+ranking,{mode:'strip'})+'return rank;')(detectJurisdiction,relationshipCompatibility,semanticDomainCompatibility,familyCandidate);
 const published=JSON.parse(fs.readFileSync(new URL('../../src/registry/published-services.json',import.meta.url),'utf8')).services;
 const rows=published.map(s=>({title:s.name.ar,binding:{service_slug:s.slug,metadata:{name_en:s.name.en,category:s.classification.main}},authority:{authority_key:s.authority.id},jurisdiction:{code:s.emirate==='عجمان'?'AE-AJ':s.emirate==='دبي'?'AE-DU':'AE'},haystack:[s.slug,s.name.ar,s.name.en,s.authority.ar,s.authority.en].join(' ')}));

 const expected='issuance-of-a-new-work-permit-golden-visa-holders';
 for(const q of ['ما الرسوم الحكومية لتصريح عمل لحامل الإقامة الذهبية؟','محتاج تصريح عمل وأنا معايا إقامة ذهبية','What are the government fees for a Golden Visa holder work permit?','Work permit documents for Golden Residence holders'])assert.equal(rank(q,rows,null,null)[0]?.binding.service_slug,expected,q);
 for(const q of ['إلغاء تصريح عمل لحامل الإقامة الذهبية','تجديد تصريح عمل لحامل الإقامة الذهبية','Amend a Golden Visa holder work permit'])assert.deepEqual(rank(q,rows,null,null),[],q+' must not become a new permit or a residence service');
 assert.equal(rank('أريد التقديم على الإقامة الذهبية في الإمارات',rows,null,null)[0]?.binding.service_slug,'golden-residency-uae');
});
