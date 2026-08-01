import assert from 'node:assert/strict';
import test from 'node:test';
import { assertPageLinkPolicy, serviceRoute } from '../../src/core/route-policy.mjs';
import { buildSearchIndex, search } from '../../src/core/search-index.mjs';
import { validateRegistry } from '../../src/core/registry-validator.mjs';

function evidence(type = 'manual-log') {
  return { type, value: 'evidence/test.log', capturedAt: '2026-08-01T10:00:00.000Z' };
}

function fixture() {
  return {
    id: 'test-service',
    slug: 'test-service',
    name: { ar: 'خدمة اختبار', en: 'Test service' },
    emirateId: 'federal',
    authorityId: 'test-authority',
    category: { mainId: 'test-category', subId: 'test-subcategory' },
    keywords: { ar: ['اختبار'], en: ['test'] },
    documents: [],
    fees: [],
    conditions: [],
    steps: [{ order: 1, title: { ar: 'ابدأ', en: 'Start' }, description: { ar: 'نفذ', en: 'Execute' } }],
    executionLinks: [{
      id: 'web',
      label: { ar: 'تنفيذ', en: 'Execute' },
      url: 'https://government.example/transactions/test',
      channel: 'web',
      target: 'exact-transaction',
      official: true,
      lastTestedAt: '2026-08-01T10:00:00.000Z',
      testEvidence: [evidence('http-log')]
    }],
    officialSources: [{
      url: 'https://government.example/services/test',
      title: { ar: 'المصدر الرسمي', en: 'Official source' },
      checkedAt: '2026-08-01T10:00:00.000Z'
    }],
    relatedServiceIds: [],
    alternativeServiceIds: [],
    faq: [],
    lastUpdated: '2026-08-01',
    verification: {
      status: 'verified',
      reviewedAt: '2026-08-01T10:00:00.000Z',
      reviewer: 'architecture-test',
      evidence: [evidence()],
      notes: { ar: 'موثق', en: 'Verified' }
    }
  };
}

function data(service = fixture()) {
  return {
    registry: { schemaVersion: '1.0.0', services: [service] },
    authorities: { authorities: [{ id: 'test-authority', officialDomains: ['government.example'] }] },
    categories: {
      mainCategories: [{ id: 'test-category' }],
      subCategories: [{ id: 'test-subcategory', mainId: 'test-category' }]
    },
    emirates: { emirates: [{ id: 'federal' }] }
  };
}

test('one entity validates and owns its derived route', () => {
  const service = fixture();
  assert.equal(validateRegistry(data(service), { publish: true }).valid, true);
  assert.equal(serviceRoute(service), '/services/test-service/');
});

test('verified service without link evidence cannot pass', () => {
  const service = fixture();
  service.executionLinks[0].testEvidence = [];
  assert.equal(validateRegistry(data(service), { publish: true }).valid, false);
});

test('publish mode blocks draft records', () => {
  const service = fixture();
  service.verification.status = 'draft';
  assert.equal(validateRegistry(data(service), { publish: true }).valid, false);
});

test('execution URL must belong to the selected authority', () => {
  const service = fixture();
  service.executionLinks[0].url = 'https://wrong.example/transaction';
  assert.equal(validateRegistry(data(service), { publish: true }).valid, false);
});

test('homepage cannot contain a government execution link', () => {
  assert.throws(() => assertPageLinkPolicy({
    pageType: 'home',
    links: [{ kind: 'government-execution', href: 'https://government.example/transactions/test' }]
  }));
});

test('search index is derived only from verified registry entities', () => {
  const index = buildSearchIndex([fixture()]);
  assert.equal(index.length, 1);
  assert.equal(search(index, 'اختبار')[0].route, '/services/test-service/');
});
