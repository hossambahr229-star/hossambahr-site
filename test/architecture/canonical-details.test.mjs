import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {canonicalText, canonicalFees, canonicalDetails} from '../../src/registry/canonical-details.mjs';
import {officialExcerpt} from '../../src/publication/english-catalog.mjs';
const {services} = JSON.parse(await readFile(new URL('../../src/registry/registry.json', import.meta.url)));
const published = JSON.parse(await readFile(new URL('../../src/registry/published-services.json', import.meta.url))).services;

test('canonical details survive the complete publication build for all four records', () => {
 for(const source of services) {
  const row=published.find(item=>item.id===source.id);
  const ar=canonicalDetails(source), en=canonicalDetails(source,'en');
  assert.ok(ar.fees && ar.duration && ar.eligibility, source.id);
  assert.equal(row.governmentFees.text,ar.fees,source.id);
  assert.equal(row.processingTime.text,ar.duration,source.id);
  assert.equal(row.conditions,ar.eligibility,source.id);
  assert.deepEqual(row.localizedDetails.en,en,source.id);
  for(const field of ['feesVerified','durationVerified','eligibilityVerified'])assert.equal(row.verification[field],true,source.id);
  assert.equal(row.lastReviewedAt,source.lastReviewedAt,'normalization must not claim a new review');
 }
});
test('DLD structured fees retain both permit prices and exhibition notes', () => {
 const source=services.find(item=>item.id==='dld-real-estate-ad-permit-dubai');
 for(const language of ['ar','en']) {
  const fees=canonicalFees(source.governmentFees,language);
  for(const amount of ['5000','1000','20','10,200','1,020'])assert.ok(fees.includes(amount),amount);
  for(const item of source.governmentFees.items) {
   assert.ok(fees.includes(item.label[language]));
   assert.ok(fees.includes(item.notes[language]));
  }
 }
});
test('unknown objects and placeholders cannot become published prices or prose', () => {
 assert.equal(canonicalText({status:'unknown'}),'');
 assert.equal(canonicalText({ar:'NOT_OFFICIALLY_PUBLISHED'}),'');
 assert.equal(canonicalText([{ar:'Known'}, {text:{ar:'Second'}}]),'Known; Second');
 assert.equal(canonicalFees({items:[{label:{ar:'Fee'},amount:0,currency:'AED'}]}),'Fee 0 AED');
 assert.equal(canonicalFees({items:[{amount:5000}]}),'');
 assert.equal(canonicalFees({items:[{amount:-1,currency:'AED'}]}),'');
});
test('English details use recorded English and escape markup', () => {
 const html=officialExcerpt('Fees','Arabic source','Recorded <amount>');
 assert.match(html,/Recorded &lt;amount&gt;/);
 assert.doesNotMatch(html,/translation is not yet available/);
 assert.doesNotMatch(officialExcerpt('Fees',null,'orphan text'),/orphan text/);
});
