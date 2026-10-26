import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {officialVariantMarkup,pathwayMarkup} from '../../service-pathways.js';import {customerContext} from '../../src/publication/customer-execution.mjs';
const {services}=JSON.parse(await readFile(new URL('../../src/registry/published-services.json',import.meta.url),'utf8'));
test('job visa duration cards preserve canonical identity and honest partial detail status',()=>{
 const job=services.find(s=>s.id==='directory:residency:34');assert.ok(job);assert.deepEqual(job.officialVariantCards.map(c=>c.durationDays),[60,90,120]);
 assert.equal(job.verification.detailsVerified,false);assert.equal(job.verification.eligibilityVerified,false);assert.equal(job.documents.items.length,0);
 for(const locale of ['ar','en']){const markup=officialVariantMarkup(job,locale),pathway=pathwayMarkup(job,locale);assert.equal((markup.match(/data-official-variant-days=/g)||[]).length,3);assert.ok(pathway.includes((locale==='en'?'/en':'')+job.internalRoute+'#official-variant-options'));assert.match(pathway,/data-hb-direct-whatsapp/);assert.doesNotMatch(markup,/1000|درهم|AED/);for(const card of job.officialVariantCards)assert.ok(markup.includes(card.informationUrl));}
 assert.deepEqual(customerContext(job).official_variant_cards,job.officialVariantCards);
 const other=services.find(s=>s.id!==job.id);assert.equal(officialVariantMarkup(other),'');assert.ok(pathwayMarkup(other).includes(other.officialCtaUrl.replaceAll('&','&amp;')));
});
test('duration card publication rejects duplicate durations and non-official destinations',()=>{
 const job=services.find(s=>s.id==='directory:residency:34');assert.throws(()=>officialVariantMarkup({...job,officialVariantCards:[job.officialVariantCards[0],job.officialVariantCards[0]]}),/Invalid/);
 assert.throws(()=>officialVariantMarkup({...job,officialVariantCards:[job.officialVariantCards[0],{durationDays:90,informationUrl:'https://example.invalid/',reviewedAt:'2026-10-27'}]}),/Invalid/);
});
