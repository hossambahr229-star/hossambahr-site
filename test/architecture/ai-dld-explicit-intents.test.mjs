import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {stripTypeScriptTypes} from 'node:module';
import {detectJurisdiction,relationshipCompatibility,semanticDomainCompatibility} from '../../supabase/functions/public-ai-concierge/semantic-context.ts';
import {familyCandidate} from '../../supabase/functions/public-ai-concierge/family-candidates.ts';
test('Dubai valuation and government-letter title transfer resolve without an external provider',()=>{
 const source=fs.readFileSync(new URL('../../supabase/functions/public-ai-concierge/index.ts',import.meta.url),'utf8');
 const utilities=source.slice(source.indexOf('function normalize('),source.indexOf('type SemanticState'));
 const ranking=source.slice(source.indexOf('function specialBoost('),source.indexOf('async function selectSemanticCandidate'));
 const {rank,specialBoost}=Function('detectJurisdiction','relationshipCompatibility','semanticDomainCompatibility','familyCandidate',stripTypeScriptTypes(utilities+ranking,{mode:'strip'})+'return {rank,specialBoost};')(detectJurisdiction,relationshipCompatibility,semanticDomainCompatibility,familyCandidate);
 const published=JSON.parse(fs.readFileSync(new URL('../../src/registry/published-services.json',import.meta.url),'utf8')).services;
 const rows=published.map(s=>({title:s.name.ar,binding:{service_slug:s.slug,metadata:{name_en:s.name.en,category:s.classification.main}},authority:{authority_key:s.authority.id},jurisdiction:{code:s.emirate==='دبي'?'AE-DU':'AE'},haystack:[s.slug,s.name.ar,s.name.en,s.authority.ar,s.authority.en].join(' ')}));
 for(const [goal,slug]of [
 ['أريد تقييم عقار في دبي لدى دائرة الأراضي والأملاك','property-valuation-dubai'],
 ['I need a property valuation from Dubai Land Department','property-valuation-dubai'],
 ['أريد انتقال سند الملكية في دبي بموجب خطاب حكومي رسمي وليس بيع عقار','title-transfer-dubai'],
 ['I need transfer of a Dubai title deed according to official government letters, not a property sale','title-transfer-dubai']
 ]){const ranked=rank(goal,rows,null,null);assert.equal(ranked[0]?.binding.service_slug,slug,goal);assert.ok(ranked[0].score>=5000,'Explicit identity remains available when a provider returns an error');}
 for(const goal of ['أريد تقييم عقار في أبوظبي','I need property valuation in Sharjah','I want to buy a property in Dubai','أريد بيع عقار في دبي'])
 for(const slug of ['property-valuation-dubai','title-transfer-dubai'])assert.equal(specialBoost(goal,slug,'AE-DU'),0,goal+' must not gain a Dubai-specific property boost');
});
