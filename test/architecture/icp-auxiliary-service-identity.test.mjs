import {englishResult} from '../../supabase/functions/public-ai-concierge/english-response.ts';
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {stripTypeScriptTypes} from 'node:module';
import {detectJurisdiction,relationshipCompatibility,semanticDomainCompatibility} from '../../supabase/functions/public-ai-concierge/semantic-context.ts';
import {familyCandidate} from '../../supabase/functions/public-ai-concierge/family-candidates.ts';
test('Exact ICP auxiliary service identities survive unavailable external selection',()=>{
 const source=fs.readFileSync(new URL('../../supabase/functions/public-ai-concierge/index.ts',import.meta.url),'utf8');
 const utilities=source.slice(source.indexOf('function normalize('),source.indexOf('type SemanticState'));
 const ranking=source.slice(source.indexOf('function specialBoost('),source.indexOf('async function selectSemanticCandidate'));
 const rank=Function('detectJurisdiction','relationshipCompatibility','semanticDomainCompatibility','familyCandidate',stripTypeScriptTypes(utilities+ranking,{mode:'strip'})+'return rank;')(detectJurisdiction,relationshipCompatibility,semanticDomainCompatibility,familyCandidate);
 const published=JSON.parse(fs.readFileSync(new URL('../../src/registry/published-services.json',import.meta.url),'utf8')).services;
 const rows=published.map(s=>({title:s.name.ar,binding:{service_slug:s.slug,metadata:{name_en:s.name.en,category:s.classification.main}},authority:{authority_key:s.authority.id},jurisdiction:{code:s.emirate==='عجمان'?'AE-AJ':s.emirate==='دبي'?'AE-DU':'AE'},haystack:[s.slug,s.name.ar,s.name.en,s.authority.ar,s.authority.en].join(' ')}));


 const resolve=Function(stripTypeScriptTypes(utilities,{mode:'strip'})+'return explicitIcpAuxiliaryService;')();
 for(const q of ['ما رسوم تقرير تفاصيل الإقامة عبر ICP؟','What are the fees for the ICP residence details report?','تقرير تفاصيل الإقامة عبر ICP،','تقرير تفاصيل الإقامة عبر ICP؛']){assert.equal(resolve(q),'تقرير-تفاصيل-الإقامة-عبر-icp',q+' exact resolver');assert.equal(rank(q,rows)[0]?.binding.service_slug,'تقرير-تفاصيل-الإقامة-عبر-icp',q);assert.equal(rank(q,rows)[0]?.score,100000,q+' explicit identity must not depend on low lexical confidence');}
 for(const q of ['ما رسوم سداد غرامة مخالفة تأشيرة أو إقامة عبر ICP خارج دبي؟','What are the fees for payment of visa or residence violation fines through ICP outside Dubai?'])assert.equal(rank(q,rows)[0]?.binding.service_slug,'سداد-غرامة-مخالفة-تأشيرة-أو-إقامة-عبر-icp-خارج-دبي',q);
 for(const q of ['تقرير تفاصيل الإقامة عبر ICP في دبي','Pay a residence fine through ICP in Dubai','ICP GDRFA residence details report'])assert.deepEqual(rank(q,rows),[],q);

 for(const q of ['ICP residence fine exemption','ICP visa fine payment refund','استعلام عن غرامة إقامة عبر ICP','What are work permit fees?'])assert.equal(resolve(q),null,q);
});
