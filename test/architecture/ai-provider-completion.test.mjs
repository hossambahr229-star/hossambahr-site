import test from 'node:test';
import assert from 'node:assert/strict';
import {readAIResponse} from '../../ai-response-protocol.mjs';
import {providerFailure,completedProviderText} from '../../supabase/functions/public-ai-concierge/provider-status.ts';

const fallback={answer:{text:'الرسوم غير موثقة في المصادر المتاحة.'},engine:{external_model_used:false,mode:'deterministic-policy-resolver'}};
const context={relationship:'wife',family_members:['wife','children'],jurisdiction_hint:'AE-DU',action:'renew'};
const meta={type:'meta',goal_context:context,rate_limit:{remaining:10},result:{...fallback,answer:{text:''},engine:{external_model_used:true}}};
function stream(events, trailingNewline=true) {
 const bytes=new TextEncoder().encode(events.map(e=>JSON.stringify(e)).join('\n')+(trailingNewline?'\n':''));
 return new Response(new ReadableStream({start(c){for(let i=0;i<bytes.length;i+=3)c.enqueue(bytes.slice(i,i+3));c.close();}}),{headers:{'content-type':'application/x-ndjson'}});
}
test('JSON fallback remains usable when a provider is absent or disabled',async()=>{
 const response=new Response(JSON.stringify({ok:true,result:fallback,goal_context:context}),{headers:{'content-type':'application/json'}});
 const {payload}=await readAIResponse(response);
 assert.equal(payload.result.engine.external_model_used,false);assert.deepEqual(payload.goal_context,context);
});
test('partial Arabic deltas without terminal completion never become an external-model success',async()=>{
 const partial=[];
 await assert.rejects(readAIResponse(stream([meta,{type:'delta',delta:'إجابة غير مكتملة'}]),text=>partial.push(text)),/ai_incomplete_stream/);
 assert.equal(partial.at(-1),'إجابة غير مكتملة');
});
test('a complete generated reply requires an explicit successful terminal event',async()=>{
 const {payload}=await readAIResponse(stream([meta,{type:'delta',delta:'إجابة موثقة'},{type:'done',text:'إجابة موثقة',engine:{external_model_used:true}}],false));
 assert.equal(payload.result.engine.external_model_used,true);assert.equal(payload.result.answer.generated,true);assert.deepEqual(payload.goal_context,context);
});
test('fallback after provider failure discards partial text and preserves family and jurisdiction',async()=>{
 const {payload}=await readAIResponse(stream([meta,{type:'delta',delta:'نص مبتور'},{type:'fallback',result:{...fallback,engine:{external_model_used:true}}}]));
 assert.equal(payload.result.answer.text,fallback.answer.text);assert.equal(payload.result.engine.external_model_used,false);
 assert.deepEqual(payload.goal_context,context);assert.equal(payload.rate_limit.remaining,10);
});
test('corrupt, empty, unsuccessful and repeated completions fail closed',async()=>{
 for(const events of [[meta,{type:'done',text:'',engine:{external_model_used:true}}],[meta,{type:'done',text:'نص',engine:{external_model_used:false}}],[meta,{type:'fallback',result:fallback},{type:'delta',delta:'نص'}]])await assert.rejects(readAIResponse(stream(events)));
 await assert.rejects(readAIResponse(new Response('broken',{headers:{'content-type':'application/json'}})));
 await assert.rejects(readAIResponse(new Response('{}',{status:503})),/ai_http_503/);
});
test('quota, authentication, model access, configuration, network and timeout remain distinct',()=>{
 for(const [status,code,type,category] of [[429,'credit_balance_exhausted','insufficient_quota','QUOTA_BILLING'],[200,'insufficient_quota',null,'QUOTA_BILLING'],[401,'invalid_api_key',null,'AUTHENTICATION'],[404,'model_not_found',null,'MODEL_ACCESS'],[null,'missing_provider',null,'CONFIGURATION'],[null,'AbortError',null,'TIMEOUT'],[null,'TypeError',null,'NETWORK'],[429,'rate_limit_exceeded',null,'RATE_LIMIT']])assert.equal(providerFailure(status,code,type).category,category);
});
test('HTTP 200 failed or incomplete Responses are not accepted as generated answers',()=>{
 for(const status of ['failed','incomplete','in_progress'])assert.throws(()=>completedProviderText({status,output_text:'Partial text'}));
 assert.throws(()=>completedProviderText({status:'completed',output:[]}),/provider_empty_response/);
 assert.equal(completedProviderText({status:'completed',output:[{content:[{type:'output_text',text:'Verified '},{type:'output_text',text:'reply'}]}]}),'Verified reply');
 try{completedProviderText({status:'failed',error:{code:'credit_balance_exhausted',type:'insufficient_quota'}})}catch(e){assert.equal(e.failure.category,'QUOTA_BILLING');}
});
