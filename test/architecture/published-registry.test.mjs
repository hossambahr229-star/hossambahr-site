import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const registry = JSON.parse(await readFile(resolve(root, 'src/registry/published-services.json'), 'utf8'));

test('published registry is the normalized real-service inventory', async () => {
  assert.equal(registry.summary.services, registry.services.length);
  assert.equal(registry.summary.verified + registry.summary.pendingVerification, registry.services.length);
  assert.equal(new Set(registry.services.map((item) => item.id)).size, registry.services.length);
  assert.equal(new Set(registry.services.map((item) => item.slug)).size, registry.services.length);
  assert.equal(registry.summary.brokenActiveCtas, 0);
});

test('every published record owns a dedicated internal page and safe CTA state', async () => {
  for (const service of registry.services) {
    await access(resolve(root, 'services', service.slug, 'index.html'));
    assert.ok(service.authority.id, service.id);
    assert.ok(service.emirate, service.id);
    assert.ok(service.classification.main, service.id);
    assert.ok(service.name.ar && service.name.en, service.id);
    assert.ok(service.description, service.id);
    assert.ok(service.documents && Array.isArray(service.documents.items), service.id);
    assert.ok(service.governmentFees?.status, service.id);
    assert.ok(service.processingTime?.status, service.id);
    assert.ok(service.conditions, service.id);
    assert.ok(service.steps.length >= 4, service.id);
    assert.ok(service.faq.length >= 1, service.id);
    assert.ok(service.relatedServiceIds.length >= 1, service.id);
    assert.ok(service.alternativeServiceIds.length >= 1, service.id);
    assert.ok(service.officialInformationUrl, service.id);
    assert.ok(service.lastReviewedAt, service.id);
    if (service.verificationStatus === 'VERIFIED') assert.match(service.officialCtaUrl, /^https:\/\//, service.id);
    else assert.equal(service.officialCtaUrl, null, service.id);
  }
});

test('authority and emirate aliases are normalized centrally', () => {
  assert.equal(registry.services.some((item) => item.emirate === 'dubai'), false);
  assert.equal(registry.services.some((item) => item.authority.id === 'sharjah-ded'), false);
  assert.equal(registry.services.filter((item) => item.authority.id === 'sedd-sharjah').length, 9);
  assert.equal(registry.services.filter((item) => item.authority.id === 'dld-rera').every((item) => /Dubai Land Department/.test(item.authority.en)), true);
});

test('all generated relationships resolve to real registry entities', () => {
  const ids = new Set(registry.services.map((item) => item.id));
  for (const service of registry.services) {
    for (const id of [...service.relatedServiceIds, ...service.alternativeServiceIds]) {
      assert.ok(ids.has(id), `${service.id} -> ${id}`);
      assert.notEqual(id, service.id);
    }
  }
});

test('homepage keeps government execution behind internal service pages', async () => {
  const routing = await readFile(resolve(root, 'zero-defect-routing.js'), 'utf8');
  assert.match(routing, /function isolateHomepageGovernmentCtas\(\)/);
  assert.match(routing, /location\.pathname !== '\//);
  assert.match(routing, /anchor\.remove\(\)/);
  assert.match(routing, /function exposeActivitySearch\(\)/);
  assert.match(routing, /\/dubai-business-activities\.html/);
});

test('public summary matches the central publication registry', async () => {
  const summary = JSON.parse(await readFile(resolve(root, 'platform-summary.json'), 'utf8'));
  assert.equal(summary.services, registry.summary.services);
  assert.equal(summary.verified, registry.summary.verified);
  assert.equal(summary.authorities, registry.summary.authorities);
  assert.equal(summary.brokenActiveCtas, 0);
});
