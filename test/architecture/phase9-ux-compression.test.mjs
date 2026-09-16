import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');

test('Phase 9 homepage service summaries stay compact and expose both execution paths', async () => {
  const [home, css, stabilizer, summary] = await Promise.all([
    readFile(resolve(root, 'index.html'), 'utf8'),
    readFile(resolve(root, 'intent-first.css'), 'utf8'),
    readFile(resolve(root, 'src/publication/stabilize-homepage-runtime.mjs'), 'utf8'),
    readFile(resolve(root, 'platform-summary.json'), 'utf8').then(JSON.parse),
  ]);

  assert.equal(summary.services, 200);
  assert.equal(summary.activities, 2610);
  assert.equal(summary.coveredEmirates, 7);

  const cards = home.match(/data-phase9-card=["']compact-dual-path["']/g) || [];
  assert.ok(cards.length >= 4, 'homepage must expose the compact Phase 9 service set');
  assert.equal((home.match(/\bservice-official-action\b/g) || []).length, cards.length);
  assert.equal((home.match(/\bservice-assist-action\b/g) || []).length, cards.length);
  assert.equal((home.match(/\bhome-card-detail-action\b/g) || []).length, cards.length);
  assert.match(home, />التقديم الرسمي ↗<\/a>/);
  assert.match(home, />أنجزها معنا<\/a>/);
  assert.match(home, />التفاصيل<\/a>/);

  assert.match(css, /Phase 9 — mobile-first transaction cards/);
  assert.match(css, /@media \(max-width: 760px\)/);
  assert.match(css, /data-phase9-card="compact-dual-path"/);
  assert.match(css, /grid-template-columns:\s*minmax\(0, 1fr\) minmax\(0, 1fr\)/);
  assert.match(css, /\.en-name,[\s\S]*\.tags[\s\S]*display:\s*none !important/);

  assert.match(stabilizer, /function compactHomepageServiceCards/);
  assert.match(stabilizer, /data-government-cta="verified"/);
  assert.match(stabilizer, /data-commercial-cta="verified"/);
  assert.equal((home.match(/src=["']\/zero-defect-routing\.js/g) || []).length, 1);
  assert.equal((home.match(/href=["']\/intent-first\.css/g) || []).length, 1);
});
