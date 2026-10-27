import test from'node:test';import assert from'node:assert/strict';import{readFile}from'node:fs/promises';import{officialVariantMarkup,pathwayMarkup}from'../../service-pathways.js';import{customerContext}from'../../src/publication/customer-execution.mjs';
const {services}=JSON.parse(await readFile(new URL('../../src/registry/published-services.json',import.meta.url),'utf8')),business=services.find(s=>s.id==='directory:residency:36'),job=services.find(s=>s.id==='directory:residency:34');
test('business exploration uses distinct official duration cards without borrowing job-visa facts',async()=>{
 assert.equal(services.length,202);assert.deepEqual(business.officialVariantCards.map(c=>c.durationDays),[60,90,120]);
 const ids=['68f5bc018c587a0011cb16c1','68e350315ae59b00117383e7','68f5bc368c587a0011cb16c5'];
 assert.deepEqual(business.officialVariantCards.map(c=>new URL(c.informationUrl).searchParams.get('serviceid')),ids);
 assert.ok(business.officialVariantCards.every(c=>!job.officialVariantCards.some(j=>j.informationUrl===c.informationUrl)));
 for(const field of['requirementsVerified','feesVerified','durationVerified','eligibilityVerified','detailsVerified'])assert.equal(business.verification[field],false,field);
 assert.deepEqual(business.documents.items,[]);
 for(const locale of['ar','en']){
  const prefix=locale==='en'?'/en':'',markup=officialVariantMarkup(business,locale);
  assert.equal((markup.match(/data-official-variant-days=/g)||[]).length,3);assert.doesNotMatch(markup,/1000|درهم|AED/);
  assert.ok(pathwayMarkup(business,locale).includes(prefix+business.internalRoute+'#official-variant-options'));
  const html=await readFile(new URL('../..'+prefix+business.internalRoute+'index.html',import.meta.url),'utf8');
  assert.equal((html.match(/data-official-variant-days=/g)||[]).length,3);for(const card of business.officialVariantCards)assert.ok(html.includes(card.informationUrl));
  if(locale==='ar')assert.doesNotMatch(html,/مع اختيار الفئة داخل المعاملة/);
 }
 assert.deepEqual(customerContext(business).official_variant_cards,business.officialVariantCards);
 const matrix=JSON.parse(await readFile(new URL('../../service-matrix.json',import.meta.url),'utf8')),source=matrix.services.find(s=>s.id===business.id);
 assert.deepEqual(source.executionChoices.map(c=>c.transactionId),[944,945,946]);
});
