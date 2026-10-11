import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {stripTypeScriptTypes} from 'node:module';
import {detectJurisdiction,detectRelationship,relationshipGroup,mergeSemanticContext,relationshipCompatibility,semanticDomainCompatibility} from '../../supabase/functions/public-ai-concierge/semantic-context.ts';
import {familyCandidate} from '../../supabase/functions/public-ai-concierge/family-candidates.ts';
test('Reviewed education and eDAS identities preserve certificate origin and transaction',()=>{
 const source=fs.readFileSync(new URL('../../supabase/functions/public-ai-concierge/index.ts',import.meta.url),'utf8');
 const utilities=source.slice(source.indexOf('function normalize('),source.indexOf('type SemanticState'));
 const ranking=source.slice(source.indexOf('function specialBoost('),source.indexOf('async function selectSemanticCandidate'));
 const {rank,specialBoost,normalize}=Function('detectJurisdiction','relationshipCompatibility','semanticDomainCompatibility','familyCandidate',stripTypeScriptTypes(utilities+ranking,{mode:'strip'})+'return {rank,specialBoost,normalize};')(detectJurisdiction,relationshipCompatibility,semanticDomainCompatibility,familyCandidate);
 const published=JSON.parse(fs.readFileSync(new URL('../../src/registry/published-services.json',import.meta.url),'utf8')).services;
 const rows=published.map(s=>({title:s.name.ar,binding:{service_slug:s.slug,metadata:{name_en:s.name.en,category:s.classification.main}},authority:{authority_key:s.authority.id},jurisdiction:{code:s.emirate==='دبي'?'AE-DU':'AE'},haystack:[s.slug,s.name.ar,s.name.en,s.authority.ar,s.authority.en].join(' ')}));


 const positives=[["تصديق فاتورة تجارية أو شهادة منشأ عبر eDAS 2.0","attestation-of-commercial-invoices-via-edas-2-0"],["Attestation of commercial invoices via eDAS 2.0 with MOFA","attestation-of-commercial-invoices-via-edas-2-0"],["معادلة شهادة الثانوية من خارج الإمارات","equivalency-of-general-education-certificate-from-abroad-grade-12"],["Equivalency of a general education certificate from abroad Grade 12 with the UAE Ministry of Education","equivalency-of-general-education-certificate-from-abroad-grade-12"],["معادلة شهادة ثانوية منهاج أجنبي داخل الإمارات","equivalency-of-general-education-certificate-in-the-uae-grade-12"],["Equivalency of a general education certificate in the UAE Grade 12 with the UAE Ministry of Education","equivalency-of-general-education-certificate-in-the-uae-grade-12"],["التحقق من صحة المعادلة أو التصديق","confirming-the-authenticity-of-equivalency"],["Confirming the authenticity of an equivalency certificate with the UAE Ministry of Education","confirming-the-authenticity-of-equivalency"]];
 positives.push(['تصديق شهادة منشأ عبر eDAS 2.0','attestation-of-commercial-invoices-via-edas-2-0'],['I need equivalence of a high school certificate from abroad with the UAE Ministry of Education','equivalency-of-general-education-certificate-from-abroad-grade-12'],['Verify equivalency certificate with the UAE Ministry of Education','confirming-the-authenticity-of-equivalency']);
 for(const[label,slug]of positives)for(const focus of ['ما الرسوم الحكومية؟','كم المدة؟','What are the government fees?','What is the processing time?']){
 const goal=label+'. '+focus,ranked=rank(goal,rows,null,null);assert.equal(ranked[0]?.binding.service_slug,slug,goal);assert.ok(ranked[0].score>=5000);
 }
 const slugs=["attestation-of-commercial-invoices-via-edas-2-0","equivalency-of-general-education-certificate-from-abroad-grade-12","equivalency-of-general-education-certificate-in-the-uae-grade-12","confirming-the-authenticity-of-equivalency"];
 for(const goal of ['University degree equivalency from abroad with the UAE Ministry of Education','Equivalency of a general education certificate from abroad Grade 11 with the UAE Ministry of Education','Cancel equivalency of a general education certificate from abroad Grade 12 with the UAE Ministry of Education','Equivalency of a general education certificate in the UAE Grade 12 with KHDA','Equivalency of a general education certificate from abroad Grade 12 with the Saudi Ministry of Education','Confirming the authenticity of equivalency with the Saudi Ministry of Education','Attestation of a personal educational certificate via eDAS','Refund commercial invoice attestation via eDAS 2.0','معادلة شهادة ثانوية في الإمارات'])
 for(const slug of slugs)assert.equal(specialBoost(normalize(goal),slug,'AE'),0,goal+' must not force '+slug);
 assert.equal(specialBoost(normalize(positives[2][0]),'equivalency-of-general-education-certificate-in-the-uae-grade-12','AE'),0);
 assert.equal(specialBoost(normalize(positives[4][0]),'equivalency-of-general-education-certificate-from-abroad-grade-12','AE'),0);
});

test('Named reviewed services reset stale family context while short follow-ups preserve it',async()=>{
 const source=fs.readFileSync(new URL('../../supabase/functions/public-ai-concierge/index.ts',import.meta.url),'utf8');
 const utilities=source.slice(source.indexOf('function normalize('),source.indexOf('type SemanticState'));
 const ranking=source.slice(source.indexOf('function specialBoost('),source.indexOf('async function selectSemanticCandidate'));
 const start=source.indexOf('async function resolveSemanticState(');
 const resolve=source.slice(start,source.indexOf('\nfunction isContextualFollowUp',start));
 const compile=stripTypeScriptTypes(utilities+ranking+resolve,{mode:'strip'});
 const run=Function('detectJurisdiction','detectRelationship','relationshipGroup','mergeSemanticContext','relationshipCompatibility','semanticDomainCompatibility','familyCandidate','providerConfig',compile+'return resolveSemanticState;')(detectJurisdiction,detectRelationship,relationshipGroup,mergeSemanticContext,relationshipCompatibility,semanticDomainCompatibility,familyCandidate,()=>null);
 const context={active_service_id:'family-residency-uae',service_slug:'family-residency-uae',relationship:'wife',jurisdiction_code:'AE-DU',action:'sponsor',authority_key:'gdrfa'};
 for(const name of ['تسجيل مهني صحي في دبي','Health professional registration with DHA Dubai',"تصديق فاتورة تجارية أو شهادة منشأ عبر eDAS 2.0","Attestation of commercial invoices via eDAS 2.0 with MOFA","معادلة شهادة الثانوية من خارج الإمارات","Equivalency of a general education certificate from abroad Grade 12 with the UAE Ministry of Education","معادلة شهادة ثانوية منهاج أجنبي داخل الإمارات","Equivalency of a general education certificate in the UAE Grade 12 with the UAE Ministry of Education","التحقق من صحة المعادلة أو التصديق","Confirming the authenticity of an equivalency certificate with the UAE Ministry of Education"]){
  const latest=name+'. What are the government fees?';
  const state=await run(latest,[],context,'إقامة زوجتي في دبي');
  assert.equal(state.turn_type,'new_topic',latest);
  assert.equal(state.relationship,null,latest);
  assert.equal(state.service_slug,null,latest);
  assert.equal(state.resolved_query,latest);
 }
 for(const latest of ['ما الرسوم؟','What are the fees?']){
  const state=await run(latest,[],context,'إقامة زوجتي في دبي. '+latest);
  assert.equal(state.turn_type,'follow_up');
  assert.equal(state.relationship,'wife');
  assert.equal(state.service_slug,'family-residency-uae');
 }
 const switched=await run('الشارقة',[],context,'إقامة زوجتي في الشارقة');
 assert.equal(switched.turn_type,'jurisdiction_switch');
 assert.equal(switched.relationship,'wife');
});
