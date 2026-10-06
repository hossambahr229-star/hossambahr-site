import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
// The correction workflow must exercise this gate before production promotion.

test('Phase 9 preserves dual execution paths while premium homepage exposes them as product architecture', async () => {
  const [home, service, stabilizer, summary] = await Promise.all([
    readFile(resolve(root, 'index.html'), 'utf8'),
    readFile(resolve(root, 'services/golden-residency-uae/index.html'), 'utf8'),
    readFile(resolve(root, 'src/publication/stabilize-homepage-runtime.mjs'), 'utf8'),
    readFile(resolve(root, 'platform-summary.json'), 'utf8').then(JSON.parse),
  ]);
  assert.equal(summary.services, 200); assert.equal(summary.activities, 2610); assert.equal(summary.coveredEmirates, 7);
  assert.match(home, /premium-two-pathways/); assert.match(home, /المسار الحكومي/); assert.match(home, /أنجزها مع HOSSAM BAHR/);
  assert.match(service, /المسار الحكومي/); assert.match(service, /مسار المساعدة/); assert.match(service, /تواصل معنا لإنجاز المعاملة/);
  assert.match(stabilizer, /function compactHomepageServiceCards/);
  assert.equal((home.match(/src=["']\/zero-defect-routing\.js/g) || []).length, 1);
  assert.equal((home.match(/href=["']\/intent-first\.css/g) || []).length, 1);
});
