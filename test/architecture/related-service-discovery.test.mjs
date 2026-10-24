import {readFile} from 'node:fs/promises';import test from 'node:test';import assert from 'node:assert/strict';
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8');
test('generated related service links resolve to canonical same-authority records in both languages',async()=>{
 const {services}=JSON.parse(await read('src/registry/published-services.json'));const byId=new Map(services.map(s=>[s.id,s]));let checked=0;
 for(const service of services)for(const locale of ['ar','en']){
  const html=await read((locale==='en'?'en':'')+service.internalRoute+'index.html');
  for(const [,id,href]of html.matchAll(/data-related-service-id="([^"]+)" href="([^"]+)"/g)){
   const candidate=byId.get(id.replaceAll('&amp;','&').replaceAll('&#39;',"'").replaceAll('&quot;','"').replaceAll('&lt;','<').replaceAll('&gt;','>'));
   assert.ok(candidate,service.slug);assert.notEqual(candidate.id,service.id);assert.equal(candidate.authority.id,service.authority.id);assert.equal(href,(locale==='en'?'/en':'')+candidate.internalRoute);checked++;
  }
 }
 assert.ok(checked>services.length,'Useful discovery spans the catalog');
 const golden=await read('services/issuance-of-a-new-work-permit-golden-visa-holders/index.html');
 assert.ok(golden.includes('data-canonical-related-services'));assert.ok(!golden.includes('لا توجد خدمة مرتبطة معتمدة ضمن الجهة نفسها حالياً.'));
 assert.ok(golden.includes('class="sequence-actions"'),'Existing previous/next navigation is preserved');
});
