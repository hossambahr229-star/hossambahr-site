import test from 'node:test';import assert from 'node:assert/strict';
import {officialExcerpt} from '../../src/publication/english-catalog.mjs';
import {readFileSync} from 'node:fs';
import {recordedDetailTranslations} from '../../src/publication/recorded-detail-translations.mjs';
test('five priority journeys translate every recorded detail without dropping the Arabic source',()=>{
 const {services}=JSON.parse(readFileSync(new URL('../../src/registry/published-services.json',import.meta.url),'utf8'));
 for(const slug of ['cancel-work-permit-uae','family-residency-uae','issue-trade-license-dubai','renew-business-license-dubai','transfer-work-permit-uae']){
  const service=services.find(row=>row.slug===slug);assert.ok(service,slug);
  for(const [field,value] of Object.entries({documents:service.documents.items,eligibility:service.conditions,fees:service.governmentFees.text,duration:service.processingTime.text})){
   if(!['documents','eligibility','fees','duration'].includes(field))continue;
   for(const original of Array.isArray(value)?value:[value]){
    const translation=recordedDetailTranslations[original];assert.ok(translation,slug+' '+field);
    const html=officialExcerpt(field,value);assert.ok(html.includes(original));assert.ok(html.includes('data-platform-detail-translation'));
    assert.ok(!/[\u0600-\u06ff]/.test(translation));
    assert.deepEqual(translation.match(/\d[\d,]*/g)||[],original.match(/\d[\d,]*/g)||[],slug+' numerical fidelity');
   }
  }
 }
 const unknown=services.find(row=>row.slug==='تمديد-التأشيرة-أو-إذن-الدخول');assert.ok(unknown);assert.equal(unknown.verification.feesVerified,false);assert.ok(!officialExcerpt('Fees',unknown.governmentFees.text).includes('data-platform-detail-translation'));
});
test('platform translations preserve the original and do not claim official English wording',()=>{const source='200 درهم للطلب و100 درهم للخدمات الذكية.';const html=officialExcerpt('Government fees',source);assert.ok(html.includes('AED 200 for the application and AED 100 for smart services.'));assert.ok(html.includes("not the authority's official English wording"));assert.ok(html.includes(source));assert.ok(html.includes('<details>'));});
test('unknown and unverified details never receive invented translations',()=>{assert.ok(!officialExcerpt('Government fees','غير موثق في سجل الكتالوج').includes('blockquote'));const original='نص رسمي بلا ترجمة معتمدة في المنصة';const html=officialExcerpt('Eligibility',original);assert.ok(html.includes(original));assert.ok(html.includes('English translation is not yet available'));assert.ok(!html.includes('data-platform-detail-translation'));});

