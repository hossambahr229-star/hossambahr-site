import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
test('reviewed FTA fields survive both original and active publication inputs',()=>{
const tree=JSON.parse(fs.readFileSync(new URL('../../content/government-service-tree.json',import.meta.url),'utf8')).services;
const matrix=JSON.parse(fs.readFileSync(new URL('../../service-matrix.json',import.meta.url),'utf8')).services;
for(const slug of ['corporate-tax-registration-uae','vat-registration-uae']){
const upstream=tree.find(x=>x.id==='guide:'+slug),published=matrix.find(x=>x.slug===slug);assert.ok(upstream&&published);
for(const key of ['fees','duration'])assert.equal(published[key],upstream[key],slug+' '+key);
assert.equal(published.officialCardUrl,upstream.evidenceUrl);
assert.equal(published.faq.find(x=>x.question==='ما الرسوم؟').answer,upstream.fees);
assert.equal(published.faq.find(x=>x.question==='كم تستغرق المعاملة؟').answer,upstream.duration);
assert.match(published.duration,/20 يوم عمل/);assert.match(published.duration,slug.startsWith('corporate')?/25 دقيقة/:/45 دقيقة/);
}
});
