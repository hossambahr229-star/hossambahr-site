import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../../public-ai-concierge.js',import.meta.url),'utf8');
const helper=source.slice(source.indexOf('  async function fetchPublicAI('),source.indexOf('  async function analyze('));
function harness(responses){
 const calls=[],events=[],waits=[];
 const context={ENDPOINT:'https://example.invalid/public-ai-concierge',fetch:async(url,options)=>{calls.push({url,...options});const value=responses.shift();if(value instanceof Error)throw value;return value;},window:{dispatchEvent:e=>events.push(e)},CustomEvent:class{constructor(type,options){this.type=type;this.detail=options.detail;}},setTimeout:(cb,ms)=>{waits.push(ms);cb();}};
 return {calls,events,waits,run:vm.runInNewContext(helper+';fetchPublicAI',context)};
}
const body=JSON.stringify({goal:'business visa',history:[{role:'user',content:'Sharjah'}],context:{service_slug:'preserved'}});
test('boot rejection retries once with exact immutable body and surfaces diagnostic',async()=>{
 const h=harness([new Response(JSON.stringify({code:'BOOT_ERROR'}),{status:503}),new Response('ok')]);
 assert.equal(await (await h.run(body)).text(),'ok');assert.equal(h.calls.length,2);
 assert.equal(h.calls[0].body,body);assert.deepEqual(h.calls[0],h.calls[1]);assert.equal(h.calls[0].credentials,'omit');
 assert.equal(h.events.length,1);assert.equal(h.events[0].type,'hb:ai-boot-retry');assert.deepEqual(h.waits,[400]);
});
test('a second boot error remains a failure, with no third attempt',async()=>{
 const h=harness([new Response('first',{status:503,headers:{'sb-error-code':'BOOT_ERROR'}}),new Response('second',{status:503})]);
 const r=await h.run(body);assert.equal(r.status,503);assert.equal(await r.text(),'second');assert.equal(h.calls.length,2);
});
for(const [name,status,payload] of [['rate limit',429,{code:'BOOT_ERROR'}],['provider quota',503,{code:'QUOTA_BILLING'}],['unknown unavailable',503,{error:'unavailable'}],['server error',500,{code:'BOOT_ERROR'}],['success',200,{ok:true}]]){
 test(name+' is never retried and body is still readable',async()=>{
  const h=harness([new Response(JSON.stringify(payload),{status})]);const r=await h.run(body);
  assert.equal(r.status,status);assert.deepEqual(await r.json(),payload);assert.equal(h.calls.length,1);assert.equal(h.events.length,0);assert.equal(h.waits.length,0);
 });
}
test('network failure is propagated without replay',async()=>{const h=harness([new Error('offline')]);await assert.rejects(h.run(body),/offline/);assert.equal(h.calls.length,1);});
test('only public analyze call is switched; protected document calls remain unchanged',()=>{
 assert.match(source,/const response=await fetchPublicAI\(JSON.stringify\(\{goal:query/);
 assert.equal((source.match(/fetchPublicAI\(/g)||[]).length,2);
 assert.match(source,/fetch\(/);
});
