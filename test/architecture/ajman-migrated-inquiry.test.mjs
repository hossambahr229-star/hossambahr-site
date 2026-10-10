import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync}from'node:fs';
import{pathwayMarkup}from'../../service-pathways.js';import{customerContext}from'../../src/publication/customer-execution.mjs';
const coverage=JSON.parse(readFileSync(new URL('../../content/government-coverage-expansion.json',import.meta.url),'utf8'));const a=coverage.authorities.find(a=>a.id==='ajman-ded'),s=a.newVerifiedServices.find(s=>s.slug==='ajman-business-activity-inquiry');
const record={id:s.id,slug:s.slug,name:{ar:s.nameAr,en:s.nameEn},authority:{ar:a.labelAr,en:a.labelEn},emirate:a.emirate,internalRoute:'/services/'+s.slug+'/',officialInformationUrl:s.officialCardUrl,officialCtaUrl:s.executionUrl,officialCtaUrlEn:s.executionUrlEn};
test('migrated Ajman inquiry keeps factual card separate from both localized official execution routes',()=>{
 assert.equal(new URL(s.officialCardUrl).hostname,'www.ajmanded.ae');assert.equal(new URL(s.executionUrl).hostname,'ajded.gov.ae');assert.equal(new URL(s.executionUrlEn).searchParams.get('lang'),'en');
 for(const locale of ['ar','en']){const markup=pathwayMarkup(record,locale);assert.ok(markup.includes(locale==='en'?s.executionUrlEn:s.executionUrl));assert.ok(markup.includes('wa.me/971503780460'));}
});
test('localized execution survives customer handoff data while existing services retain their default URL',()=>{
 const context=customerContext(record);assert.equal(context.official_execution_url_en,s.executionUrlEn);assert.ok(pathwayMarkup(context,'en').includes(s.executionUrlEn));
 const legacy={...record};delete legacy.officialCtaUrlEn;assert.ok(pathwayMarkup(legacy,'en').includes(s.executionUrl));assert.equal(Object.hasOwn(customerContext(legacy),'official_execution_url_en'),false);
});
test('published facts distinguish the inquiry from unavailable licence procedures and document uploads',()=>{
 assert.match(s.fees,/الاستعلام مجاني/);assert.match(s.duration,/ليست مدة إصدار/);assert.match(s.requirements[0],/لا تتطلب.*مستندات/);assert.match(s.conditions,/التجديد والتعديل قيد التطوير/);assert.ok(a.officialDomains.includes('ajded.gov.ae'));
});

test('an officially document-free inquiry never creates a customer upload requirement',()=>{
 const context=customerContext({...record,verification:{requirementsVerified:true},documents:{items:[s.requirements[0]],noDocumentsRequired:true}});assert.deepEqual(context.requirements,[]);assert.equal(context.requirements_verified,true);assert.equal(context.no_documents_required,true);
});
