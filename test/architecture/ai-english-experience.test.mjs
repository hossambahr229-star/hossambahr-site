import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import vm from 'node:vm';
import {englishResult} from '../../supabase/functions/public-ai-concierge/english-response.ts';
test('English missing government facts retain evidence, service identity and external failure',()=>{
 const original={confidence:'high',matches:[{service_slug:'family',service_name_en:'Renew Family Residence'}],answer:{focus:'fees',fact_status:'MISSING_INFORMATION',grounded:false,evidence:{source_url:'https://example.gov.ae'}},engine:{external_model_used:false,provider_failure:{category:'QUOTA_BILLING'}}};
 const result=englishResult(original);assert.match(result.answer.text,/cannot confirm/i);assert.doesNotMatch(result.answer.text,/AED|\d/);assert.deepEqual(result.matches,original.matches);assert.deepEqual(result.answer.evidence,original.answer.evidence);assert.deepEqual(result.engine,original.engine);
});
test('English unknown pathway never becomes a confident start instruction',()=>{const r=englishResult({matches:[],answer:{focus:'start',fact_status:'MISSING_INFORMATION'}});assert.match(r.answer.text,/not available/);assert.equal(r.answer.fact_status,'MISSING_INFORMATION');});
test('English verified government excerpt remains verbatim',()=>{const original={matches:[{service_name_en:'A service'}],answer:{focus:'documents',fact_status:'VERIFIED',text:'جواز سفر ساري',evidence:{id:'one'}}};assert.match(englishResult(original).answer.text,/جواز سفر ساري/);});
const client=readFileSync(new URL('../../public-ai-concierge.js',import.meta.url),'utf8');
const helper=client.slice(client.indexOf('  function effectiveQuestion('),client.indexOf('  function quickRepliesFor('));
test('English Dubai does not repeat a missing-emirate question; unknown emirate still asks',()=>{
 const ctx={state:{original_goal:'Renew my wife residence in Dubai',answers:[]},scrubLocal:String,tr:x=>x};vm.createContext(ctx);vm.runInContext(helper,ctx);assert.equal(ctx.effectiveQuestion({result:{follow_up_questions:[]}}),'');ctx.state.original_goal='Renew my wife residence';assert.match(ctx.effectiveQuestion({result:{}}),/إمارة/);
});
test('Attachment control is a keyboard-usable button opening the native chooser',()=>{assert.match(client,/create\("button", "hb-ai-attach-control"\)/);assert.match(client,/attachLabel\.type = "button"/);assert.match(client,/attachLabel\.addEventListener\("click", \(\) => attachmentInput\?\.click\(\)\)/);});
