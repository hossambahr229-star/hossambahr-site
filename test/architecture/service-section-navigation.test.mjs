import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import test from 'node:test';
const read=path=>readFile(new URL('../../'+path,import.meta.url),'utf8');
test('work permits are discoverable under employment, with the service identity and source retained',async()=>{
 const matrix=JSON.parse(await read('service-matrix.json'));
 const registry=JSON.parse(await read('src/registry/published-services.json'));
 const work=await read('categories/work-employees/index.html');
 for(const slug of ['issuance-of-a-new-work-permit-golden-visa-holders','family-sponsored-work-permit-uae']){
  const source=matrix.services.find(s=>s.slug===slug),service=registry.services.find(s=>s.slug===slug);
  assert.equal(source.category,'work-employees');assert.equal(service.classification.main,'work-employees');
  assert.equal(service.officialInformationUrl,source.officialCardUrl);assert.equal(service.slug,source.slug);
  assert.ok(work.includes(service.internalRoute));
  const html=await read('services/'+slug+'/index.html');
  const crumbs=html.match(/<nav\b[^>]*class="breadcrumbs"[^>]*>[\s\S]*?<\/nav>/)?.[0];
  assert.ok(crumbs?.includes('/categories/work-employees/'));assert.ok(!crumbs.includes('/categories/residency-visas/'));assert.ok(!crumbs.includes('/categories/family-sponsorship/'));
 }
});
test('English service section navigation resolves in the generated document before JavaScript',async()=>{
 const registry=JSON.parse(await read('src/registry/published-services.json'));
 for(const service of registry.services){
  const html=await read('en'+service.internalRoute+'index.html');
  const nav=html.match(/<nav class="service-decision-nav"[^>]*>[\s\S]*?<\/nav>/)?.[0];
  assert.ok(nav,service.slug);const links=[...nav.matchAll(/href="#([^"]+)"/g)];
  assert.equal(links.length,6,service.slug);
  for(const [,id]of links)assert.equal([...html.matchAll(new RegExp('id="'+id+'"','g'))].length,1,service.slug+': '+id);
 }
});
