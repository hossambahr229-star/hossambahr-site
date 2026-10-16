import {englishResult} from '../../supabase/functions/public-ai-concierge/english-response.ts';
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {stripTypeScriptTypes} from 'node:module';
import {detectJurisdiction,relationshipCompatibility,semanticDomainCompatibility} from '../../supabase/functions/public-ai-concierge/semantic-context.ts';
import {familyCandidate} from '../../supabase/functions/public-ai-concierge/family-candidates.ts';
test('Domestic-worker absence reports never become labour complaints',()=>{
 const source=fs.readFileSync(new URL('../../supabase/functions/public-ai-concierge/index.ts',import.meta.url),'utf8');
 const utilities=source.slice(source.indexOf('function normalize('),source.indexOf('type SemanticState'));
 const ranking=source.slice(source.indexOf('function specialBoost('),source.indexOf('async function selectSemanticCandidate'));
 const rank=Function('detectJurisdiction','relationshipCompatibility','semanticDomainCompatibility','familyCandidate',stripTypeScriptTypes(utilities+ranking,{mode:'strip'})+'return rank;')(detectJurisdiction,relationshipCompatibility,semanticDomainCompatibility,familyCandidate);
 const published=JSON.parse(fs.readFileSync(new URL('../../src/registry/published-services.json',import.meta.url),'utf8')).services;
 const rows=published.map(s=>({title:s.name.ar,binding:{service_slug:s.slug,metadata:{name_en:s.name.en,category:s.classification.main}},authority:{authority_key:s.authority.id},jurisdiction:{code:s.emirate==='عجمان'?'AE-AJ':s.emirate==='دبي'?'AE-DU':'AE'},haystack:[s.slug,s.name.ar,s.name.en,s.authority.ar,s.authority.en].join(' ')}));


 for(const q of ['أريد تقديم بلاغ انقطاع عامل مساعد في الشارقة','بلاغ تغيب عاملة منزلية في عجمان','I need to report a domestic worker absent from work in Sharjah','Domestic worker absconding report in Ajman'])assert.equal(rank(q,rows)[0]?.binding.service_slug,'بلاغ-انقطاع-عامل-مساعد',q);
 for(const q of ['سحب بلاغ انقطاع عامل مساعد','Withdraw a domestic worker absconding report','Register a labour complaint for a domestic worker'])assert.notEqual(rank(q,rows)[0]?.binding.service_slug,'بلاغ-انقطاع-عامل-مساعد',q);
 const outsideDubaiRows=rows.filter(r=>r.binding.service_slug!=='بلاغ-انقطاع-عامل-مساعد');
 assert.deepEqual(rank('Domestic worker absconding report in Dubai',outsideDubaiRows),[],'Excluded exact service must not become a labour complaint');
});
