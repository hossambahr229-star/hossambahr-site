import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import vm from 'node:vm';
const runtime=await readFile(new URL('../../zero-defect-routing.js',import.meta.url),'utf8');
for(const route of ['/','/index.html','/en/','/services/renew-trade-license-dubai/'])for(const href of ['https://www.investindubai.gov.ae/en/business-setup/business-setup-services/renew-trade-licence','https://wa.me/971503780460']){
 test('native reviewed destination is not cancelled by page enhancement: '+route+' '+new URL(href).hostname,()=>{
  const document=Object.assign(new EventTarget(),{readyState:'loading',currentScript:null,documentElement:{lang:route.startsWith('/en/')?'en':'ar'},body:{dataset:{}},querySelector:()=>null,querySelectorAll:()=>[],getElementById:()=>null});
  const window=Object.assign(new EventTarget(),{HB_AUTH:{}});
  vm.runInNewContext(runtime,{document,window,addEventListener:window.addEventListener.bind(window),location:new URL(route,'https://hossambahr.com'),URL,setTimeout:()=>0,clearTimeout:()=>{},console},{timeout:2000});
  const anchor={href,getAttribute:name=>name==='href'?href:null},event=new Event('click',{cancelable:true,bubbles:true});
  Object.defineProperty(event,'target',{value:{closest:selector=>selector.includes('a[')?anchor:null}});
  document.dispatchEvent(event);
  assert.equal(event.defaultPrevented,false,'A real government/assistance destination must retain native browser navigation');
 });
}
