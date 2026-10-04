import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';
const client=readFileSync(new URL('../../os-client.js',import.meta.url),'utf8');
test('anonymous Arabic and English workspace retain the full return path without reading private data',async()=>{
 for(const [lang,path] of [['ar','/os/'],['en','/en/os/']]){let destination,privateReads=0;
  const auth={auth:{getSession:async()=>({data:{session:null}})},from:()=>{privateReads++;throw Error('Private read before authentication');},rpc:()=>{privateReads++;throw Error('Private RPC before authentication');}};
  const context={window:{HB_AUTH:auth},document:{documentElement:{lang},readyState:'complete',querySelector:()=>{throw Error('Private UI must not load before authentication');}},location:{pathname:path,search:'?handoff=1',hash:'#ai-intake',replace:value=>{destination=value;}}};
  vm.runInNewContext(client,context);await new Promise(done=>setImmediate(done));
  assert.equal(destination,(lang==='en'?'/en':'')+'/auth/?return='+encodeURIComponent(path+'?handoff=1#ai-intake'));assert.equal(privateReads,0);
 }
});
test('English workspace translation keeps manual approval meaning and markup boundaries',()=>{
 const context={window:{},document:{documentElement:{lang:'en'}}};vm.runInNewContext(readFileSync(new URL('../../os-i18n.js',import.meta.url),'utf8'),context);
 assert.match(context.window.HB_UI_T('لا يسمح النظام للوكيل الذكي باعتماد دفعة، توقيع، إجراء غير قابل للتراجع، أو إرسال خارجي حساس بدون بوابة موافقة مناسبة.'),/require the appropriate approval/);
 assert.equal(context.window.HB_OS_HTML('<b data-case-id="keep">مستندات</b>'),'<b data-case-id="keep">Documents</b>');
});
