import assert from 'node:assert/strict';
import test from 'node:test';
import { assertPageLinkPolicy, assertServiceRouteEligibility, serviceRoute } from '../../src/core/route-policy.mjs';
import { buildSearchIndex, search } from '../../src/core/search-index.mjs';
import { validateRegistry } from '../../src/core/registry-validator.mjs';
import { evaluateServiceBusinessAcceptance } from '../../src/business/business-acceptance.mjs';
import { readFile } from 'node:fs/promises';

function evidence(type = 'manual-log') {
  return { type, value: 'evidence/test.log', capturedAt: '2026-08-01T10:00:00.000Z' };
}

function fixture() {
  return {
    id: 'test-service',
    sourceLegacyIds: ['guide:test-service'],
    slug: 'test-service',
    name: { ar: 'خدمة اختبار', en: 'Test service' },
    description: { ar: 'وصف الخدمة', en: 'Service description' },
    audiences: [{ ar: 'الأفراد', en: 'Individuals' }],
    requestType: { ar: 'إصدار', en: 'Issue' },
    emirateId: 'federal',
    authorityId: 'test-authority',
    category: { mainId: 'test-category', subId: 'test-subcategory' },
    customerTypeIds: ['individual'],
    activityIds: ['test-activity'],
    licenseTypeIds: ['test-license'],
    classificationNumbers: ['TEST-001'],
    keywords: { ar: ['اختبار'], en: ['test'] },
    documents: {
      status: 'not-required',
      items: [],
      notes: { ar: 'لا توجد مستندات', en: 'No documents required' }
    },
    governmentFees: {
      status: 'free',
      items: [],
      notes: { ar: 'الرسوم الحكومية مجانية', en: 'Government fees are free' }
    },
    serviceFees: {
      status: 'free',
      items: [],
      notes: { ar: 'لا توجد رسوم خدمة', en: 'No service fee' }
    },
    conditions: [],
    eligibility: [{ ar: 'المؤهلون', en: 'Eligible applicants' }],
    exceptions: [],
    duration: { ar: 'يوم عمل', en: 'One business day' },
    steps: [{ order: 1, title: { ar: 'ابدأ', en: 'Start' }, description: { ar: 'نفذ', en: 'Execute' } }],
    officialGovernmentLink: {
      id: 'web',
      label: { ar: 'تنفيذ', en: 'Execute' },
      url: 'https://government.example/transactions/test',
      channel: 'web',
      target: 'exact-transaction',
      official: true,
      lastTestedAt: '2026-08-01T10:00:00.000Z',
      testEvidence: [evidence('http-log')]
    },
    officialSources: [{
      url: 'https://government.example/services/test',
      title: { ar: 'المصدر الرسمي', en: 'Official source' },
      checkedAt: '2026-08-01T10:00:00.000Z'
    }],
    relatedServiceIds: [],
    alternativeServiceIds: [],
    faq: [{ question: { ar: 'كيف أبدأ؟', en: 'How do I start?' }, answer: { ar: 'من زر التنفيذ', en: 'Use the execution button' } }],
    lastUpdated: '2026-08-01',
    lastReviewedAt: '2026-08-01T10:00:00.000Z',
    verification: {
      status: 'verified',
      reviewedAt: '2026-08-01T10:00:00.000Z',
      reviewer: 'architecture-test',
      evidence: [evidence()],
      notes: { ar: 'موثق', en: 'Verified' }
    },
    businessAcceptance: {
      status: 'passed',
      servicePage: { testedAt: '2026-08-01T10:00:00.000Z', httpStatus: 200, nonEmpty: true, evidence: [evidence('screenshot')] },
      search: {
        testedAt: '2026-08-01T10:00:00.000Z',
        methodsVerified: ['name', 'keywords', 'authority', 'emirate', 'activity', 'license-type', 'classification-number', 'related-service'],
        evidence: [evidence('manual-log')]
      },
      journey: { testedAt: '2026-08-01T10:00:00.000Z', homeToExecutionClicks: 2, evidence: [evidence('manual-log')] },
      manualTest: {
        testedAt: '2026-08-01T10:00:00.000Z', result: 'passed', tester: 'architecture-test', evidence: [evidence('manual-log')],
        notes: { ar: 'ناجح', en: 'Passed' }
      }
    },
    lifecycle: {
      approvedAt: '2026-08-01T09:00:00.000Z',
      routeCreatedAt: '2026-08-01T09:10:00.000Z',
      registryInsertedAt: '2026-08-01T09:20:00.000Z',
      relationshipsLinkedAt: '2026-08-01T09:30:00.000Z',
      publishReadyAt: '2026-08-01T10:00:00.000Z'
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
    emirates: { emirates: [{ id: 'federal', name: { ar: 'اتحادي', en: 'Federal' } }] },
    businessDimensions: {
      customerTypes: [{ id: 'individual', name: { ar: 'فرد', en: 'Individual' } }],
      activities: [{ id: 'test-activity', name: { ar: 'نشاط', en: 'Activity' } }],
      licenseTypes: [{ id: 'test-license', name: { ar: 'رخصة', en: 'License' } }],
      classifications: [{ id: 'TEST-001', name: { ar: 'تصنيف', en: 'Classification' } }]
    }
  };
}

test('one entity validates and owns its derived route', () => {
  const service = fixture();
  assert.equal(validateRegistry(data(service), { publish: true }).valid, true);
  assert.equal(serviceRoute(service), '/services/test-service/');
});

test('verified service without link evidence cannot pass', () => {
  const service = fixture();
  service.officialGovernmentLink.testEvidence = [];
  assert.equal(validateRegistry(data(service), { publish: true }).valid, false);
});

test('publish mode blocks draft records', () => {
  const service = fixture();
  service.verification.status = 'draft';
  assert.equal(validateRegistry(data(service), { publish: true }).valid, false);
});

test('execution URL must belong to the selected authority', () => {
  const service = fixture();
  service.officialGovernmentLink.url = 'https://wrong.example/transaction';
  assert.equal(validateRegistry(data(service), { publish: true }).valid, false);
});

test('business acceptance blocks implicit empty documents and fees', () => {
  const service = fixture();
  service.documents.status = 'required';
  service.governmentFees.status = 'paid';
  const result = validateRegistry(data(service), { publish: true });
  assert.equal(result.valid, false);
  assert.equal(result.errors.some((error) => error.path.endsWith('documents.items')), true);
  assert.equal(result.errors.some((error) => error.path.endsWith('governmentFees.items')), true);
});

test('business acceptance verifies all discovery methods and a two-click journey', () => {
  const first = fixture();
  const second = structuredClone(fixture());
  second.id = 'related-service';
  second.slug = 'related-service';
  second.sourceLegacyIds = ['guide:related-service'];
  second.name = { ar: 'خدمة مرتبطة', en: 'Related service' };
  second.officialGovernmentLink.url = 'https://government.example/transactions/related';
  first.relatedServiceIds = [second.id];
  second.relatedServiceIds = [first.id];
  const context = data(first);
  context.registry.services = [first, second];
  const result = evaluateServiceBusinessAcceptance(first, { ...context, services: context.registry.services });
  assert.equal(result.searchChecks.name, true);
  assert.equal(result.searchChecks['license-type'], true);
  assert.equal(result.searchChecks['classification-number'], true);
  assert.equal(result.searchChecks['related-service'], true);
  assert.equal(result.checks.underThreeClicks, true);
  assert.equal(result.accepted, true);
});

test('three clicks fails the business journey criterion', () => {
  const service = fixture();
  service.businessAcceptance.journey.homeToExecutionClicks = 3;
  const validation = validateRegistry(data(service), { publish: true });
  assert.equal(validation.valid, false);
  assert.equal(validation.errors.some((error) => error.path.endsWith('homeToExecutionClicks')), true);
});

test('homepage cannot contain a government execution link', () => {
  assert.throws(() => assertPageLinkPolicy({
    pageType: 'home',
    links: [{ kind: 'government-execution', href: 'https://government.example/transactions/test' }]
  }));
});

test('route creation is forbidden before business approval', () => {
  const service = fixture();
  service.businessAcceptance.status = 'pending';
  assert.throws(() => assertServiceRouteEligibility(service, [service]), /business acceptance has not passed/);
});

test('route creation is forbidden while a related service is unapproved', () => {
  const service = fixture();
  service.relatedServiceIds = ['future-related-service'];
  assert.throws(() => assertServiceRouteEligibility(service, [service]), /related service is not approved/);
});

test('placeholder service content can never receive a route', () => {
  const service = fixture();
  service.description.en = 'Coming soon';
  assert.throws(() => assertServiceRouteEligibility(service, [service]), /placeholder content is forbidden/);
});

test('search index is derived only from verified registry entities', () => {
  const index = buildSearchIndex([fixture()]);
  assert.equal(index.length, 1);
  assert.equal(search(index, 'اختبار')[0].route, '/services/test-service/');
  assert.equal(search(index, 'TEST-001')[0].route, '/services/test-service/');
  assert.equal(search(index, 'test-license')[0].route, '/services/test-service/');
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
