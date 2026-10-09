import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync}from'node:fs';import{recordedDetailTranslations}from'../../src/publication/recorded-detail-translations.mjs';
const matrix=JSON.parse(readFileSync(new URL('../../service-matrix.json',import.meta.url),'utf8'));
const manifest=JSON.parse(readFileSync(new URL('../../content/moe-edas-field-review-2026-10-08.json',import.meta.url),'utf8'));
test('ICP ID support fields preserve category qualifiers and unknown fees',()=>{
 const replacement=matrix.services.find(x=>x.slug==='بدل-فاقد-أو-تالف-للهوية');
 assert.match(replacement.requirements[0],/بحسب فئة/);assert.match(replacement.conditions,/15/);assert.match(replacement.conditions,/ICAO/);assert.match(replacement.fees,/300/);assert.match(replacement.fees,/100/);assert.match(replacement.fees,/150/);assert.match(replacement.duration,/^5 أيام/);
 const refund=matrix.services.find(x=>x.slug==='استرداد-رسوم-إصدار-الهوية-غير-المكتمل');
 assert.match(refund.requirements[0],/IBAN/);assert.match(refund.conditions,/غير قابلة للاسترداد/);
 for(const slug of ['الإعفاء-من-غرامة-تأخير-الهوية',refund.slug]){const row=matrix.services.find(x=>x.slug===slug);assert.equal(row.fees,'غير موثق بعد');assert.ok(!manifest.records.find(x=>x.slug===slug).fields.includes('fees'));}
 for(const slug of [replacement.slug,refund.slug,'الإعفاء-من-غرامة-تأخير-الهوية']){const row=matrix.services.find(x=>x.slug===slug),record=manifest.records.find(x=>x.slug===slug);assert.equal(row.lastReviewed,'2026-10-09');assert.match(record.method,/HTTP 500/);for(const field of record.fields){for(const original of Array.isArray(row[field])?row[field]:[row[field]]){const english=recordedDetailTranslations[original];assert.ok(english,slug+' '+field);assert.ok(!/[\u0600-\u06ff]/.test(english));assert.deepEqual(english.match(/\d+(?:,\d{3})*(?:\.\d+)?/g)||[],original.match(/\d+(?:,\d{3})*(?:\.\d+)?/g)||[]);}}}
});
