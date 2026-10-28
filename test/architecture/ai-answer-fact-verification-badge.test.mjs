import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync}from'node:fs';import vm from'node:vm';
const read=p=>readFileSync(new URL('../../'+p,import.meta.url),'utf8'),client=read('public-ai-concierge.js');
const start=client.indexOf('  function hasVerifiedAnswerFact('),end=client.indexOf('  function buildAssistantMessage(',start);
assert.ok(start>=0&&end>start);const verified=vm.runInNewContext(client.slice(start,end)+';hasVerifiedAnswerFact');
const payload=(status='VERIFIED_FACT')=>({result:{grounding:{source_backed:true},answer:{fact_status:status,grounded:true,evidence:{source_url:'https://icp.gov.ae/en/services-details/?serviceid=example'}},matches:[{service_slug:'partial-parent-record',details_verified:false}]}});
test('missing conditions on a valid official service never gain a verified-answer badge',()=>{assert.equal(verified(payload('MISSING_INFORMATION')),false);});
for(const status of ['NEEDS_CLARIFICATION','DERIVED_GUIDANCE','VERIFIED',undefined]){
 test('non-fact status '+status+' is not presented as a verified answer',()=>{const p=payload();p.result.answer.fact_status=status;assert.equal(verified(p),false);});
}
test('a separately verified fact remains eligible even when other service details are partial',()=>{assert.equal(verified(payload()),true);});
test('missing grounding or official evidence fails closed',()=>{
 for(const change of [p=>p.result.grounding.source_backed=false,p=>p.result.answer.grounded=false,p=>delete p.result.answer.evidence.source_url,p=>p.result.answer.evidence.source_url='http://example.invalid']){
  const p=payload();change(p);assert.equal(verified(p),false);
 }
 assert.equal(verified(null),false);assert.equal(verified({result:{}}),false);
});
test('actual renderer gates the green badge by the answer fact and scopes the review date to its source',()=>{
 assert.ok(client.includes('if (hasVerifiedAnswerFact(payload)) {'));
 assert.ok(client.includes('Source last reviewed: '));assert.ok(client.includes('آخر مراجعة للمصدر: '));
 assert.ok(!client.includes('تم التحقق من المعلومة • آخر تحقق: '));
 assert.ok(client.includes('link.href = match.official_source.url;'),'source citation stays available');
});
test('service fact containers cannot invent unconditional CSS verification labels',()=>{
 const css=read('ai/hb-ai.css');assert.ok(!css.includes('.hb-chat-facts:before'));
 assert.ok(css.includes('.hb-chat-facts{'),'real service facts are retained');
});
