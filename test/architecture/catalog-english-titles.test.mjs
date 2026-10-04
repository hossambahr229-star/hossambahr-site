import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {rankServices} from '../../intent-search.js';
const registry=JSON.parse(await readFile(new URL('../../src/registry/published-services.json',import.meta.url),'utf8'));
const translations=JSON.parse(await readFile(new URL('../../src/registry/service-title-translations.json',import.meta.url),'utf8'));
test('all 200 services have an English discovery title without replacing Arabic identity',()=>{
 assert.equal(registry.services.length,200);
 const services=registry.services.map(service=>({s:service.slug,u:service.internalRoute,a:service.name.ar,e:translations[service.slug]||service.name.en,m:service.emirate,i:service.authority.id,r:service.authority.ar,n:service.authority.en,k:service.keywords}));
 for(const service of services){
  assert.ok(service.a,service.s);
  assert.ok(/[a-z]/i.test(service.e)&&!/[\u0600-\u06ff]/.test(service.e),service.s+' '+service.e);
  assert.ok(rankServices(service.e,services).some(result=>result.s===service.s),service.s);
 }
 for(const slug of Object.keys(translations)) assert.ok(services.some(service=>service.s===slug),slug);
});
