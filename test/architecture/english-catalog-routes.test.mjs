import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {englishDiscoveryRecords,englishServiceRoute,serviceCard,officialExcerpt} from '../../src/publication/english-catalog.mjs';
import {rankServices} from '../../intent-search.js';
const registry=JSON.parse(readFileSync(new URL('../../src/registry/published-services.json',import.meta.url),'utf8'));
const translations=JSON.parse(readFileSync(new URL('../../src/registry/service-title-translations.json',import.meta.url),'utf8'));
const services=registry.services.map(service=>({...service,name:{...service.name,en:translations[service.slug]||service.name.en}}));
test('English search preserves service identity and locale for all 200 services',()=>{
 const records=englishDiscoveryRecords(services);assert.equal(records.length,200);
 for(const service of services){
  const found=rankServices(service.name.en,records).find(item=>item.s===service.slug);
  assert.ok(found,service.slug);assert.equal(found.u,englishServiceRoute(service));
  assert.ok(serviceCard(service).includes('href="'+found.u+'"'));
 }
});
test('unavailable facts are explicit and original source text is labelled and escaped',()=>{
 assert.ok(officialExcerpt('Fees','NOT_OFFICIALLY_PUBLISHED').includes('verified detail is not available'));
 assert.ok(!officialExcerpt('Fees','غير موثق بعد').includes('blockquote'));
 const html=officialExcerpt('Conditions','<script>example</script>');
 assert.ok(html.includes('original language'));assert.ok(html.includes('lang="ar" dir="rtl"'));assert.ok(!html.includes('<script>'));
});
