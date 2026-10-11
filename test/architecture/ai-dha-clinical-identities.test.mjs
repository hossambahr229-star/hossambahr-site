import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {stripTypeScriptTypes} from 'node:module';
import {detectJurisdiction,relationshipCompatibility,semanticDomainCompatibility} from '../../supabase/functions/public-ai-concierge/semantic-context.ts';
import {familyCandidate} from '../../supabase/functions/public-ai-concierge/family-candidates.ts';
test('DHA clinical identities preserve authority, action and service object',()=>{
 const source=fs.readFileSync(new URL('../../supabase/functions/public-ai-concierge/index.ts',import.meta.url),'utf8');
 const utilities=source.slice(source.indexOf('function normalize('),source.indexOf('type SemanticState'));
 const ranking=source.slice(source.indexOf('function specialBoost('),source.indexOf('async function selectSemanticCandidate'));
 const {rank,specialBoost,normalize}=Function('detectJurisdiction','relationshipCompatibility','semanticDomainCompatibility','familyCandidate',stripTypeScriptTypes(utilities+ranking,{mode:'strip'})+'return {rank,specialBoost,normalize};')(detectJurisdiction,relationshipCompatibility,semanticDomainCompatibility,familyCandidate);
 const published=JSON.parse(fs.readFileSync(new URL('../../src/registry/published-services.json',import.meta.url),'utf8')).services;
 const rows=published.map(s=>({title:s.name.ar,binding:{service_slug:s.slug,metadata:{name_en:s.name.en,category:s.classification.main}},authority:{authority_key:s.authority.id},jurisdiction:{code:s.emirate==='دبي'?'AE-DU':'AE'},haystack:[s.slug,s.name.ar,s.name.en,s.authority.ar,s.authority.en].join(' ')}));


 const positives=[
 ['إصدار ترخيص منشأة صحية جديدة في دبي لدى هيئة الصحة بدبي','new-healthcare-facility-license-dubai'],
 ['New healthcare facility license in Dubai with DHA','new-healthcare-facility-license-dubai'],
 ['تفعيل ترخيص منشأة صحية في دبي لدى هيئة الصحة بدبي','activate-healthcare-facility-license-dubai'],
 ['Activate healthcare facility license in Dubai with DHA','activate-healthcare-facility-license-dubai'],
 ['تسجيل مهني صحي في دبي لدى هيئة الصحة بدبي','health-professional-registration-dubai'],
 ['Health professional registration in Dubai with DHA','health-professional-registration-dubai'],
 ['Register as a nurse with DHA in Dubai','health-professional-registration-dubai'],
 ['تسجيل طبيب في دبي لدى هيئة الصحة بدبي','health-professional-registration-dubai']
 ];
 for(const[label,slug]of positives)for(const focus of ['ما الرسوم الحكومية؟','كم المدة؟','What are the government fees?','What is the processing time?']){
 const goal=label+'. '+focus,ranked=rank(goal,rows,null,null);assert.equal(ranked[0]?.binding.service_slug,slug,goal);assert.ok(ranked[0].score>=5000);
 }
 const dhaSlugs=['new-healthcare-facility-license-dubai','activate-healthcare-facility-license-dubai','health-professional-registration-dubai'];
 for(const goal of ['Renew a healthcare facility license in Dubai with DHA','Cancel a healthcare facility license in Dubai with DHA','Amend a healthcare facility license in Dubai with DHA','Activate a health professional license in Dubai with DHA','DHA account registration in Dubai','New healthcare facility license in Sharjah','New healthcare facility license in Abu Dhabi','New DHCC healthcare facility license in Dubai','New healthcare facility license in Dubai with DHA and DHCC'])
 for(const slug of dhaSlugs)assert.ok(specialBoost(normalize(goal),slug,'AE-DU')<=0,goal+' must not force '+slug);
 for(const goal of ['New healthcare facility license in Dubai with DHA','Renew a healthcare facility license in Dubai with DHA'])assert.ok(specialBoost(normalize(goal),'issue-trade-license-dubai','AE-DU')<0,goal+' must not become a commercial licence');
 for(const goal of ['New trade license for a healthcare facility in Dubai with DHA','New trade license in Dubai'])assert.equal(rank(goal,rows,null,null)[0]?.binding.service_slug,'issue-trade-license-dubai',goal);
});
