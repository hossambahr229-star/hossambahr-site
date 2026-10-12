import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import{recordedDetailTranslations}from'../../src/publication/recorded-detail-translations.mjs';
test('Current MOFA duration preserves issued-document and courier conditions across source and publication',()=>{
 const read=path=>JSON.parse(fs.readFileSync(new URL('../../'+path,import.meta.url),'utf8'));
 const manifest=read('content/mofa-current-duration-review-2026-10-12.json'),matrix=read('service-matrix.json').services,tree=read('content/government-service-tree.json').services,published=read('src/registry/published-services.json').services;
 for(const fact of manifest.facts){const s=matrix.find(s=>s.slug===fact.slug),t=tree.find(t=>t.id===s.id),p=published.find(p=>p.slug===fact.slug);
 assert.equal(s.duration,fact.duration);assert.equal(t.duration,fact.duration);assert.equal(p.processingTime.text,fact.duration);
 const englishHtml=fs.readFileSync(new URL('../../en/services/'+fact.slug+'/index.html',import.meta.url),'utf8');assert.ok(englishHtml.includes(fact.durationEn),fact.slug+' actual generated English page');assert.equal(recordedDetailTranslations[fact.duration],fact.durationEn);
 assert.match(fact.duration,/7 أيام عمل/);assert.match(fact.duration,/المستندات الصادرة من الإمارات/);assert.ok(!fact.duration.includes('15 يوم'));
 }
});
test('Reviewed RTA NOC fee and time rules have complete explanatory English translations',()=>{
 const manifest=JSON.parse(fs.readFileSync(new URL('../../content/rta-noc-reviewed-policy-field-sync-2026-10-12.json',import.meta.url),'utf8'));
 for(const fact of manifest.facts)for(const field of fact.fields)assert.equal(recordedDetailTranslations[fact[field]],fact[field+'En'],fact.slug+' '+field);
});
