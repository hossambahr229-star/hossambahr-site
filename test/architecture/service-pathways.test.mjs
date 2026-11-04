import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {whatsappHref,pathwayMarkup,pathwayRecord} from '../../service-pathways.js';
const {services}=JSON.parse(await readFile(new URL('../../src/registry/published-services.json',import.meta.url),'utf8'));
test('every canonical service has adjacent official and WhatsApp execution paths in both languages',()=>{
 for(const service of services)for(const locale of ['ar','en']){
  const url=new URL(whatsappHref(service,locale));
  assert.equal(url.hostname,'wa.me');assert.equal(url.pathname,'/971503780460');
  const message=url.searchParams.get('text');assert.ok(message.includes(service.name[locale]));assert.ok(message.includes(service.id));
  assert.ok(message.includes('https://hossambahr.com'+(locale==='en'?'/en':'')+service.internalRoute));
  const markup=pathwayMarkup(service,locale);assert.ok(markup.includes('data-hb-direct-whatsapp'));assert.ok(markup.includes(service.officialVariantCards?.length>1?(locale==='en'?'/en':'')+service.internalRoute+'#official-variant-options':(locale==='en'?(service.officialCtaUrlEn||service.officialCtaUrl):service.officialCtaUrl).replaceAll('&','&amp;')));
 }
});
test('handoff excludes arbitrary conversation and private document fields',()=>{
 const s={...services[0],history:'PRIVATE_CONVERSATION',passport:'PRIVATE_PASSPORT',document:'PRIVATE_DOCUMENT'};
 const message=decodeURIComponent(whatsappHref(s));assert.ok(!message.includes('PRIVATE_'));
});


test('English WhatsApp preserves each published jurisdiction instead of a generic placeholder',async()=>{
 const {emirateEnglish}=await import('../../src/publication/english-catalog.mjs');
 for(const service of services){const message=new URL(whatsappHref(service,'en')).searchParams.get('text');const expected=emirateEnglish(service.emirate);assert.doesNotMatch(expected,/[\u0600-\u06ff]/,service.slug);assert.match(message,new RegExp('Emirate / jurisdiction: '+expected.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));assert.doesNotMatch(message,/See service jurisdiction/);}
});
test('explicit translated scope wins and unknown scope stays visibly unconfirmed',()=>{
 const service={...services[0],emirate:'CUSTOM_SCOPE',emirate_en:'Reviewed custom scope'};assert.equal(pathwayRecord(service,'en').emirate_en,'Reviewed custom scope');delete service.emirate_en;assert.equal(pathwayRecord(service,'en').emirate_en,'See service jurisdiction');
});
