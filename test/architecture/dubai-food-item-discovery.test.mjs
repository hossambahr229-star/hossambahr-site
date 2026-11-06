import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { discoverServices } from '../../transaction-discovery.js';
const records = JSON.parse(await readFile(new URL('../../transaction-discovery-data.json', import.meta.url), 'utf8'));
const registry = JSON.parse(await readFile(new URL('../../src/registry/published-services.json', import.meta.url), 'utf8'));
const slug = 'register-assess-food-item-dubai';
test('Product registration resolves to the existing authority guidance and never to a premises approval', () => {
  for (const query of ['تسجيل منتج غذائي دبي','تقييم منتجات غذائية في دبي','Register food product in Dubai','Food item registration Dubai']) {
    const result = discoverServices(records, { query });
    assert.deepEqual(result.map(x => x.s), [slug]);
    assert.equal(result[0].destinationKind, 'OFFICIAL_GUIDANCE');
  }
  assert.deepEqual(discoverServices(records, { query: 'register food product in Sharjah' }), []);
  assert.deepEqual(discoverServices(records, { query: 'تسجيل منتج غذائي دبي', authority:'mohre' }), []);
  assert.equal(discoverServices(records, { query:'اعتماد مخطط التصميم الداخلي لمنشأة غذائية في دبي' })[0].s, 'food-establishment-layout-approval-dubai');
});
test('The official guide does not turn unknown application details into verified facts', () => {
  const record = (Array.isArray(registry)?registry:registry.services).find(x => x.slug === slug);
  assert.equal(record.destinationKind,'OFFICIAL_GUIDANCE');
  for (const key of ['requirementsVerified','feesVerified','durationVerified','eligibilityVerified']) assert.equal(record.verification[key],false,key);
  assert.equal(new URL(record.officialCtaUrl).hostname,'www.dm.gov.ae');
  assert.equal(new URL(record.officialCtaUrlEn).hostname,'www.dm.gov.ae');
});
