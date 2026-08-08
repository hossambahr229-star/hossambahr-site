import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const publication = JSON.parse(await readFile(resolve(root, 'src/publication/det-publication-registry.json'), 'utf8'));

test('DET publication layer classifies exactly 15 services', () => {
  assert.equal(publication.services.length, 15);
  assert.equal(new Set(publication.services.map((service) => service.slug)).size, 15);
});

test('only verified services may have an active official URL', () => {
  for (const service of publication.services) {
    if (service.classification === 'VERIFIED') assert.match(service.officialUrl, /^https:\/\/(?:www\.)?(?:investindubai|dubaidet)\.gov\.ae\//);
    else assert.equal(service.officialUrl, null);
  }
});

test('known broken initial-approval redirect is rejected, not published', () => {
  const service = publication.services.find((item) => item.slug === 'initial-approval-dubai');
  assert.equal(service.classification, 'PENDING_VERIFICATION');
  assert.equal(service.officialUrl, null);
  assert.match(service.rejectedUrl, /request-for-initial-approval/);
});
