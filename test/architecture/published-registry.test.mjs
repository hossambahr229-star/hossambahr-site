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
    if (service.verificationStatus === 'VERIFIED') assert.match(service.officialCtaUrl, /^https:\/\//, service.id);
    else assert.equal(service.officialCtaUrl, null, service.id);
  }
});
