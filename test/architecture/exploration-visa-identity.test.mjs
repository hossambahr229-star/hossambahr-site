import test from'node:test';import assert from'node:assert/strict';import fs from'node:fs';import{stripTypeScriptTypes}from'node:module';
import{transactionObject,transactionObjectMatches,transactionObjectNeedsEmirate,explorationVisaFollowUp}from'../../supabase/functions/public-ai-concierge/transaction-object.ts';
import{detectJurisdiction}from'../../supabase/functions/public-ai-concierge/semantic-context.ts';
import{jurisdictionCandidates}from'../../supabase/functions/public-ai-concierge/response-context.ts';
const source=fs.readFileSync(new URL('../../supabase/functions/public-ai-concierge/index.ts',import.meta.url),'utf8'),utilities=source.slice(source.indexOf('function normalize('),source.indexOf('type SemanticState'));
const normalize=Function(stripTypeScriptTypes(utilities,{mode:'strip'})+'return normalize;')();
const published=JSON.parse(fs.readFileSync(new URL('../../src/registry/published-services.json',import.meta.url),'utf8')).services;
const codes={'دبي':'AE-DU','أبوظبي':'AE-AZ','الشارقة':'AE-SH','عجمان':'AE-AJ','رأس الخيمة':'AE-RK','الفجيرة':'AE-FU','أم القيوين':'AE-UQ'};
const rows=published.map(s=>({title:s.name.ar,binding:{service_slug:s.slug,authority_key:s.authority.id,metadata:{name_en:s.name.en}},jurisdiction:{code:codes[s.emirate]||'AE'}}));
const businessIcp='تأشيرة-استكشاف-فرص-تأسيس-الأعمال-عبر-icp-خارج-دبي',businessDubai='تأشيرة-استكشاف-فرص-تأسيس-الأعمال-في-دبي',jobIcp='تأشيرة-استكشاف-فرص-عمل-عبر-icp-خارج-دبي',jobDubai='تأشيرة-استكشاف-فرص-عمل-في-دبي';
function resolve(q,prior=null){
 const jurisdiction=detectJurisdiction(q)||prior?.jurisdiction||null,n=normalize(q),intent=prior?explorationVisaFollowUp(prior.slug,jurisdiction,prior.action||null,n):transactionObject(n,jurisdiction);
 if(!intent||transactionObjectNeedsEmirate(intent)&&(!jurisdiction||jurisdiction==='AE'))return [];
 return jurisdictionCandidates(rows,jurisdiction).filter(r=>transactionObjectMatches(intent,normalize(r.title+' '+r.binding.metadata.name_en),r.binding.authority_key)).map(r=>r.binding.service_slug);
}
test('explicit exploration visas resolve exact source-backed objects without external selection',()=>{
 for(const[q,expected]of[
 ['أريد تأشيرة لاستكشاف فرص تأسيس الأعمال في الشارقة لمدة90 يوماً. ما المسار الرسمي؟',businessIcp],
 ['I need a business exploration visa in Sharjah for90 days.',businessIcp],
 ['أبغي فيزا استكشاف فرص استثمار في أبوظبي',businessIcp],
 ['تأشيرة استكشاف فرص تأسيس الأعمال في دبي',businessDubai],
 ['Business opportunities exploration visa Dubai',businessDubai],
 ['Can I work on a business exploration visa in Sharjah?',businessIcp],
 ['تأشيرة استكشاف فرص تأسيس الأعمال في الشارقة هل تسمح بالعمل؟',businessIcp],
 ['Does a job exploration visa allow business opportunities in Dubai?',jobDubai],
 ['عايز تأشيرة أبحث عن شغل في الشارقة',jobIcp],
 ['أبي فيزا أدور وظيفة في أبوظبي',jobIcp],
 ['Job exploration visa Ajman',jobIcp],
 ['I need a job seeker visa in Dubai',jobDubai]
 ])assert.deepEqual(resolve(q),[expected],q);
});
test('unknown jurisdiction, unsupported operation and conflicting authority cannot become issuance',()=>{
 for(const q of['تأشيرة استكشاف فرص تأسيس الأعمال','Job seeker visa','Renew business exploration visa in Sharjah','Cancel job seeker visa Dubai','تمديد تأشيرة استكشاف فرص عمل في الشارقة','ICP business exploration visa Dubai','GDRFA job seeker visa Sharjah','ICP GDRFA business exploration visa Dubai','Business exploration visa or job seeker visa in Dubai'])assert.deepEqual(resolve(q),[],q);
 for(const q of['عايز أفتح شركة في الشارقة','جدد رخصة تجارية في دبي','إقامة زوجتي دبي','I need a work permit Sharjah','Business visit visa Dubai'])assert.doesNotMatch(transactionObject(normalize(q),detectJurisdiction(q))?.kind||'',/exploration-visa/,q);
});
test('known exploration context keeps its object through detail and emirate followups',()=>{
 assert.deepEqual(resolve('والأوراق إيه؟',{slug:businessIcp,jurisdiction:'AE-SH'}),[businessIcp]);
 assert.deepEqual(resolve('ولو في دبي؟',{slug:businessIcp,jurisdiction:'AE-SH'}),[businessDubai]);
 assert.deepEqual(resolve('What if it is in Sharjah?',{slug:businessDubai,jurisdiction:'AE-DU'}),[businessIcp]);
 assert.deepEqual(resolve('والرسوم؟',{slug:jobIcp,jurisdiction:'AE-SH'}),[jobIcp]);
 assert.deepEqual(resolve('ولو في دبي؟',{slug:jobIcp,jurisdiction:'AE-SH'}),[jobDubai]);
 assert.deepEqual(resolve('الغيها',{slug:jobIcp,jurisdiction:'AE-SH'}),[]);
 assert.deepEqual(resolve('والأوراق؟',{slug:'untrusted-unpublished-service',jurisdiction:'AE-SH'}),[]);
});
test('production resolves scoped explicit and carried exploration objects before general ranking',()=>{
 assert.match(source,/contextualFollowUp \? explorationVisaFollowUp/);
 assert.ok(source.includes('transactionObject(normalize(latestTurn),currentJurisdiction)'));
 assert.ok(source.includes('const explicitObject = pendingObject || carriedExplorationObject'));
 assert.match(source,/else if\(explicitObject\)\{\s*ranked=explicitRows/);
});
