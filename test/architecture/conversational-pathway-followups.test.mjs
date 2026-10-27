import test from'node:test';import assert from'node:assert/strict';import fs from'node:fs';import{stripTypeScriptTypes}from'node:module';import{detectJurisdiction,detectRelationship}from'../../supabase/functions/public-ai-concierge/semantic-context.ts';import{governmentPathHref,pathwayMarkup}from'../../service-pathways.js';
const source=fs.readFileSync(new URL('../../supabase/functions/public-ai-concierge/index.ts',import.meta.url),'utf8'),utilities=source.slice(source.indexOf('function normalize('),source.indexOf('type SemanticState')),helpers=source.slice(source.indexOf('function isContextualFollowUp('),source.indexOf('function groundedAnswer('));
const {isContextualFollowUp,answerFocus}=Function('detectJurisdiction','detectRelationship',stripTypeScriptTypes(utilities+helpers,{mode:'strip'})+'return{isContextualFollowUp,answerFocus};')(detectJurisdiction,detectRelationship);
test('English location-only followups pass the actual production context gate',()=>{
 for(const place of['Dubai','Abu Dhabi','Sharjah','Ajman','Ras Al Khaimah','Fujairah','Umm Al Quwain'])assert.equal(isContextualFollowUp('What if it is in '+place+'?'),true,place);
 for(const q of['What if I open a company in Sharjah?','What if I cancel a licence in Dubai?'])assert.equal(isContextualFollowUp(q),false,q);
 assert.equal(isContextualFollowUp('ولو في دبي؟'),true);
});
test('a selected visa period is not confused with processing time',()=>{
 for(const q of['أريد تأشيرة لاستكشاف فرص تأسيس الأعمال في الشارقة لمدة90 يوماً. ما المسار الرسمي؟','أريد تأشيرة لمدة٩٠ يوماً','I need an exploration visa for90 days. What is the official route?'])assert.equal(answerFocus(q),'overview',q);
 for(const q of['كم تستغرق معاملة تأشيرة لمدة90 يوماً؟','What is the processing time for a90-day visa?','مدة الإنجاز لهذه التأشيرة'])assert.equal(answerFocus(q),'duration',q);
 assert.equal(answerFocus('ما الرسوم لتأشيرة لمدة90 يوماً؟'),'fees');assert.equal(answerFocus('المستندات لتأشيرة لمدة90 يوماً؟'),'documents');
});
test('chat and service cards share duration destinations while ordinary government links remain external',()=>{
 const services=JSON.parse(fs.readFileSync(new URL('../../customer-execution-data.json',import.meta.url),'utf8'));
 for(const id of['directory:residency:34','directory:residency:36']){const s=services.find(x=>x.service_id===id);for(const locale of['ar','en']){const href=(locale==='en'?'/en':'')+s.source_page+'#official-variant-options';assert.equal(governmentPathHref(s,locale),href);assert.ok(pathwayMarkup(s,locale).includes(href));}}
 const ordinary=services.find(x=>x.service_slug==='family-residency-uae');assert.equal(governmentPathHref(ordinary),ordinary.official_execution_url);
});
