import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { rankActivities, rankServices } from '../../intent-search.js';

const root = resolve(import.meta.dirname, '../..');
const registry = JSON.parse(await readFile(resolve(root, 'src/registry/published-services.json'), 'utf8'));
const services = registry.services.map(service => ({
  s: service.slug, u: service.internalRoute, a: service.name.ar, e: service.name.en,
  m: service.emirate, i: service.authority.id, r: service.authority.ar, n: service.authority.en,
  c: service.classification.main, b: service.classification.sub, k: service.keywords,
  d: service.description, v: service.verificationStatus
}));
const activitySource = await readFile(resolve(root, 'dubai-activities-data.js'), 'utf8');
const activities = JSON.parse(activitySource.slice(activitySource.indexOf('=') + 1).replace(/;\s*$/, ''));

test('natural Arabic family intent resolves to Dubai family renewal', () => {
  assert.equal(rankServices('أريد أجدد إقامة زوجتي في دبي', services)[0].s, 'تجديد-إقامة-أفراد-الأسرة-في-دبي');
  assert.equal(rankServices('تجديد إقامة زوجتي', services)[0].s, 'تجديد-إقامة-أفراد-الأسرة-في-دبي');
});

test('English residence intent remains discoverable in the shared directory ranker', () => {
  const results = rankServices('renew residence', services);
  assert.ok(results.length > 0);
  assert.match(`${results[0].a} ${results[0].e}`, /renew|تجديد/i);
});

test('service directory uses the shared intent ranker instead of literal all-word matching', async () => {
  const runtime = await readFile(resolve(root, 'zero-defect-routing.js'), 'utf8');
  const searchRuntime = await readFile(resolve(root, 'intent-search.js'), 'utf8');
  assert.match(searchRuntime, /window\.HB_rankServices\s*=\s*rankServices/);
  assert.match(runtime, /window\.HB_rankServices\(query, window\.HB_INTENT_SERVICES/);
  assert.match(runtime, /det-search-button[^\n]+addEventListener\("click", apply\)/);
  assert.match(runtime, /loadDirectoryScript\("\/intent-search\.js", true\)/);
});

test('inside-UAE hiring resolves to transfer work permit', () => {
  assert.equal(rankServices('أريد أوظف شخص موجود داخل الإمارات', services)[0].s, 'transfer-work-permit-uae');
});

test('company setup respects the requested emirate', () => {
  const result = rankServices('أريد أفتح شركة في أبوظبي', services)[0];
  assert.match(result.m, /أبوظبي/);
  assert.match(result.s, /abu-dhabi/);
});

test('English natural-language query resolves to overseas work permit', () => {
  assert.equal(rankServices('hire an employee from outside UAE', services)[0].s, 'new-work-permit-overseas-uae');
});

test('business idea returns clothing activities and code search is exact', () => {
  assert.match(rankActivities('أريد أفتح محل ملابس ولا أعرف النشاط', activities)[0].nameEn, /clothes|garment|fashion|textile/i);
  assert.equal(rankActivities('514929', activities)[0].code, '514929');
});

test('Dubai cleaning-company intent combines licensing and activity discovery', () => {
  const service = rankServices('أريد أفتح شركة تنظيف في دبي', services)[0];
  const activity = rankActivities('أريد أفتح شركة تنظيف في دبي', activities)[0];
  assert.match(service.m, /دبي|dubai/i);
  assert.match(`${service.a} ${service.e}`, /رخص|ترخيص|licen/i);
  assert.match(activity.nameEn, /clean|wash/i);
});

test('external Production acceptance journeys rank the correct service family first', () => {
  const scenarios = [
    ['أريد فتح شركة تنظيف في دبي', 'issue-trade-license-dubai'],
    ['شركة مقاولات في دبي', 'issue-trade-license-dubai'],
    ['تجديد رخصة في دبي', 'renew-business-license-dubai'],
    ['إلغاء موظف', 'cancel-work-permit-uae'],
  ];
  for (const [query, slug] of scenarios) {
    assert.equal(rankServices(query, services)[0]?.s, slug, query);
  }
});

test('beginner phrases stay discoverable without authority terminology', () => {
  const scenarios = [
    'أريد أجدد الرخصة',
    'أريد أقفل الشركة',
    'راتبي متأخر وأريد أشتكي',
    'أريد أوثق توكيل',
  ];
  for (const query of scenarios) assert.ok(rankServices(query, services).length > 0, query);
});

test('partial activity code search returns the matching code family', () => {
  const results = rankActivities('5149', activities);
  assert.ok(results.length > 0);
  assert.ok(results[0].code.startsWith('5149'));
});

test('final beginner journeys resolve to the correct legal service family', () => {
  const scenarios = [
    ['عايز أعمل إقامة لمراتي', /family-residency/],
    ['أريد إقامة لزوجتي', /family-residency/],
    ['عايز أفتح شركة في دبي', /^issue-trade-license-dubai$/],
    ['الرخصة انتهت', /renew.*license|license.*renew/],
    ['عايز أجدد الرخصة', /renewal|renew.*license|license.*renew/],
    ['عايز أجيب أخويا زيارة', /زيارة-قريب-أو-صديق/],
    ['عايز أعمل إقامة لعامل', /إصدار-إقامة-موظف|issue.*residence/],
    ['عايز أضيف نشاط', /activity|activities/],
    ['عايز أضيف شريك', /add-remove-partner/],
    ['عايز ألغي الشركة', /cancellation|cancel-business-license/],
    ['عايز أغير اسم الشركة', /amendment|amend-business-license/],
  ];
  for (const [query, expected] of scenarios) {
    const result = rankServices(query, services)[0];
    assert.ok(result, query);
    assert.match(result.s, expected, `${query} => ${result.s}`);
  }
});

test('unmatched text does not return arbitrary verified services', () => {
  assert.deepEqual(rankServices('zzzz qqqq غير مفهوم إطلاقًا', services), []);
});

