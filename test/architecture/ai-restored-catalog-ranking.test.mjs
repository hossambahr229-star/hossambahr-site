import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {stripTypeScriptTypes} from 'node:module';
import {detectJurisdiction,relationshipCompatibility,semanticDomainCompatibility} from '../../supabase/functions/public-ai-concierge/semantic-context.ts';
import {familyCandidate} from '../../supabase/functions/public-ai-concierge/family-candidates.ts';
test('actual AI ranker discovers restored services without replacing an RTA NOC with a DET licence',()=>{
 const source=fs.readFileSync(new URL('../../supabase/functions/public-ai-concierge/index.ts',import.meta.url),'utf8');
 const utilities=source.slice(source.indexOf('function normalize('),source.indexOf('type SemanticState'));
 const ranking=source.slice(source.indexOf('function specialBoost('),source.indexOf('async function selectSemanticCandidate'));
 const rank=Function('detectJurisdiction','relationshipCompatibility','semanticDomainCompatibility','familyCandidate',stripTypeScriptTypes(utilities+ranking,{mode:'strip'})+'return rank;')(detectJurisdiction,relationshipCompatibility,semanticDomainCompatibility,familyCandidate);
 const published=JSON.parse(fs.readFileSync(new URL('../../src/registry/published-services.json',import.meta.url),'utf8')).services;
 const rows=published.map(s=>({title:s.name.ar,binding:{service_slug:s.slug,metadata:{name_en:s.name.en,category:s.classification.main}},authority:{authority_key:s.authority.id},jurisdiction:{code:s.emirate==='عجمان'?'AE-AJ':s.emirate==='دبي'?'AE-DU':'AE'},haystack:[s.slug,s.name.ar,s.name.en,s.authority.ar,s.authority.en].join(' ')}));
 const restored=['ajman-business-activity-inquiry','legacy-service-85a10469d8','legacy-service-e7f35a06d9','legacy-service-67abe5ccf3','rta-renew-trade-license-noc-dubai','rta-new-trade-license-noc-dubai','dld-real-estate-ad-permit-dubai','rta-modify-trade-license-noc-dubai'];
 for(const slug of restored){const row=rows.find(r=>r.binding.service_slug===slug);assert.ok(row);assert.equal(rank(row.title,rows,null,null)[0]?.binding.service_slug,slug,row.title);}
 for(const [goal,slug] of [['RTA NOC to renew a trade license in Dubai','rta-renew-trade-license-noc-dubai'],['RTA NOC to amend a trade license in Dubai','rta-modify-trade-license-noc-dubai'],['RTA NOC for a new trade license in Dubai','rta-new-trade-license-noc-dubai']])assert.equal(rank(goal,rows,null,null)[0]?.binding.service_slug,slug,goal);
});
