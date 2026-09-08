import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { hasActivityIntent } from '../../intent-search.js';

const registry = JSON.parse(await readFile(new URL('../../src/registry/published-services.json', import.meta.url), 'utf8'));
const summary = JSON.parse(await readFile(new URL('../../platform-summary.json', import.meta.url), 'utf8'));

test('every published service exposes field-level truthful verification', () => {
  assert.equal(registry.services.length, 200);
  for (const service of registry.services) {
    const verification = service.verification;
    assert.ok(verification, service.slug);
    assert.equal(verification.officialLinkVerified, true, service.slug);
    assert.match(verification.officialLinkLastCheckedAt, /^\d{4}-\d{2}-\d{2}/);
    assert.match(verification.dataLastReviewedAt, /^\d{4}-\d{2}-\d{2}/);
    assert.ok(verification.sourceAuthority);
    assert.match(verification.sourceUrl, /^https:\/\//);
    assert.equal(verification.requirementsVerified, service.documents.status === 'PUBLISHED');
    assert.equal(verification.feesVerified, service.governmentFees.status === 'PUBLISHED_OR_CONDITIONAL');
    assert.equal(verification.durationVerified, service.processingTime.status === 'PUBLISHED_OR_CONDITIONAL');
    assert.equal(verification.detailsVerified, verification.verifiedDetailCount === verification.totalDetailFields);
  }
});

test('summary counters are derived from the same registry truth model', () => {
  assert.equal(summary.services, registry.services.length);
  assert.equal(summary.officialLinksVerified, registry.services.filter((service) => service.verification.officialLinkVerified).length);
  assert.equal(summary.fullyVerifiedDetails, registry.services.filter((service) => service.verification.detailsVerified).length);
  assert.equal(summary.partiallyVerifiedDetails, registry.services.filter((service) => !service.verification.detailsVerified).length);
  const categoryTotal = Object.values(summary.categoryCounts).reduce((sum, value) => sum + value, 0);
  assert.equal(categoryTotal, registry.services.length);
});

test('all service pages show truthful trust state and both execution paths', async () => {
  for (const service of registry.services) {
    const html = await readFile(new URL(`../../services/${service.slug}/index.html`, import.meta.url), 'utf8');
    assert.match(html, /data-verification-label=/, service.slug);
    const expectedLabel = service.destinationKind === 'DIRECT_EXECUTION'
      ? 'ابدأ التنفيذ الحكومي الرسمي'
      : service.destinationKind === 'OFFICIAL_GUIDANCE'
        ? 'افتح الدليل الحكومي الرسمي'
        : 'افتح صفحة الخدمة الحكومية';
    assert.ok(html.includes(expectedLabel), `${service.slug}: ${expectedLabel}`);
    assert.match(html, /تواصل معنا لإنجاز المعاملة/, service.slug);
    assert.match(html, /آخر تحقق من الرابط الرسمي/, service.slug);
    assert.match(html, /آخر مراجعة لمحتوى الخدمة/, service.slug);
  }
});

test('the one safe legacy alias redirects without an unnecessary click', async () => {
  const html = await readFile(new URL('../../services/initial-approval-dubai/index.html', import.meta.url), 'utf8');
  assert.match(html, /location\.replace\(["']\/services\/issue-trade-license-dubai\//);
});

test('activity suggestions appear only for business or activity intent', () => {
  assert.equal(hasActivityIntent('أريد أجدد إقامة زوجتي'), false);
  assert.equal(hasActivityIntent('أحتاج تصريح عمل'), false);
  assert.equal(hasActivityIntent('أريد أفتح شركة تنظيف في دبي'), true);
  assert.equal(hasActivityIntent('أريد فتح محل ملابس'), true);
  assert.equal(hasActivityIntent('749301'), true);
});
