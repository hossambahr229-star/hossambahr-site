import assert from 'node:assert/strict';
import test from 'node:test';
import { assertPageLinkPolicy, serviceRoute } from '../../src/core/route-policy.mjs';
import { buildSearchIndex, search } from '../../src/core/search-index.mjs';
import { validateRegistry } from '../../src/core/registry-validator.mjs';
import { readFile } from 'node:fs/promises';

function evidence(type = 'manual-log') {
  return { type, value: 'evidence/test.log', capturedAt: '2026-08-01T10:00:00.000Z' };
}

function fixture() {
  return {
    id: 'test-service',
    slug: 'test-service',
    name: { ar: 'خدمة اختبار', en: 'Test service' },
    description: { ar: 'وصف الخدمة', en: 'Service description' },
    audiences: [{ ar: 'الأفراد', en: 'Individuals' }],
    requestType: { ar: 'إصدار', en: 'Issue' },
    emirateId: 'federal',
    authorityId: 'test-authority',
    category: { mainId: 'test-category', subId: 'test-subcategory' },
    keywords: { ar: ['اختبار'], en: ['test'] },
    documents: [],
    fees: [],
    conditions: [],
    eligibility: [{ ar: 'المؤهلون', en: 'Eligible applicants' }],
    exceptions: [],
    duration: { ar: 'يوم عمل', en: 'One business day' },
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
    authorities: { authorities: [{
      id: 'test-authority',
      name: { ar: 'جهة اختبار', en: 'Test authority' },
      abbreviation: 'TEST',
      governmentLevel: 'federal',
      emirateId: 'federal',
      officialDomains: ['government.example'],
      verification: {
        status: 'official-source-confirmed',
        checkedAt: '2026-08-01T10:00:00.000Z',
        sourceUrls: ['https://government.example/about']
      }
    }] },
    categories: {
      mainCategories: [{ id: 'test-category', name: { ar: 'تصنيف', en: 'Category' } }],
      subCategories: [{ id: 'test-subcategory', mainId: 'test-category', name: { ar: 'فرعي', en: 'Subcategory' } }]
    },
    emirates: { emirates: [{ id: 'federal', name: { ar: 'اتحادي', en: 'Federal' } }] }
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

test('controlled jurisdiction catalog contains federal scope and all seven emirates', async () => {
  const catalog = JSON.parse(await readFile(new URL('../../src/registry/emirates.json', import.meta.url), 'utf8'));
  assert.equal(catalog.emirates.length, 8);
  assert.equal(new Set(catalog.emirates.map((item) => item.id)).size, 8);
  assert.equal(catalog.emirates.filter((item) => item.scope === 'federal').length, 1);
  assert.equal(catalog.emirates.filter((item) => item.scope === 'emirate').length, 7);
  assert.equal(catalog.emirates.every((item) => item.name.ar && item.name.en), true);
});

test('normalized authority catalog retains official-source evidence and unique domains', async () => {
  const catalog = JSON.parse(await readFile(new URL('../../src/registry/authorities.json', import.meta.url), 'utf8'));
  assert.equal(catalog.authorities.length, 9);
  assert.equal(new Set(catalog.authorities.map((item) => item.id)).size, 9);
  assert.equal(catalog.authorities.every((item) => item.verification.status === 'official-source-confirmed'), true);
  assert.equal(catalog.authorities.every((item) => item.verification.sourceUrls.length > 0), true);
});
