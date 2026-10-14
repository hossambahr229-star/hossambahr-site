import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../../auth-client.js',import.meta.url),'utf8');
for(const english of [false,true]) test('service save preserves canonical slug and locale: '+(english?'en':'ar'),async()=>{
 const slug='إقامة-الزوجة';const pathname=(english?'/en':'')+'/services/'+encodeURIComponent(slug)+'/';let button,payload;
 const hero={querySelector:()=>null,append:value=>{button=value;}};
 const main={querySelector:selector=>selector==='h1'?{textContent:'Service title'}:hero};
 const client={auth:{getSession:async()=>({data:{session:{user:{id:'synthetic-user'}}}}),onAuthStateChange:()=>{}},from:()=>({upsert:async value=>{payload=value;return {error:null};}})};
 const document={documentElement:{lang:english?'en':'ar'},readyState:'complete',querySelector:selector=>selector==='main'?main:null,createElement:()=>({dataset:{},addEventListener:(_name,handler)=>{buttonHandler=handler;}})};let buttonHandler;
 vm.runInNewContext(source,{window:{HB_AUTH_CONFIG:{url:'https://example.invalid',publishableKey:'synthetic'},supabase:{createClient:()=>client}},document,location:{pathname,search:'',hash:''},URL,URLSearchParams,Set,setTimeout});
 await new Promise(resolve=>setImmediate(resolve));assert.ok(button);assert.equal(button.textContent,english?'Save to my account':'حفظ في حسابي');await buttonHandler();assert.equal(payload.service_slug,slug);assert.equal(payload.user_id,'synthetic-user');assert.equal(button.textContent,english?'Saved to your account':'تم الحفظ في حسابك');
});
