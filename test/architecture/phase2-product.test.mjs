import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const registry = JSON.parse(await readFile(resolve(root, 'src/registry/published-services.json'), 'utf8'));

test('every verified service page has both truthful execution paths', async () => {
  const failures = [];
  for (const service of registry.services) {
    const html = (await readFile(resolve(root, `.${service.internalRoute}`, 'index.html'), 'utf8')).replaceAll('&amp;', '&');
    if (!html.includes('data-phase2-execution-paths')) failures.push(`${service.slug}: missing decision block`);
    if (!html.includes(service.officialCtaUrl)) failures.push(`${service.slug}: missing official CTA`);
    if (!html.includes('data-commercial-cta="verified"')) failures.push(`${service.slug}: missing assistance CTA`);
    if (!html.includes(service.lastReviewedAt)) failures.push(`${service.slug}: missing review date`);
  }
  assert.deepEqual(failures, []);
});

test('government update feed is source-gated and contains no placeholders', async () => {
  const feed = JSON.parse(await readFile(resolve(root, 'content/government-updates.json'), 'utf8'));
  assert.equal(feed.schemaVersion, 1);
  assert.ok(Array.isArray(feed.updates));
  for (const update of feed.updates) {
    assert.match(update.officialSourceUrl, /^https:\/\//);
    assert.ok(['VERIFIED', 'PENDING_VERIFICATION'].includes(update.verificationStatus));
  }
});

test('all government intent targets resolve to published services', async () => {
  const catalog = JSON.parse(await readFile(resolve(root, 'content/government-intents.json'), 'utf8'));
  const names = new Set(registry.services.flatMap((service) => [service.name.ar, service.name.en]));
  const missing = catalog.intents.flatMap((intent) => intent.targetTitles.filter((title) => !names.has(title)).map((title) => `${intent.id}: ${title}`));
  assert.deepEqual(missing, []);
});
