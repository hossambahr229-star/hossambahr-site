import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = file => readFile(new URL('../../'+file,import.meta.url),'utf8');
test('Every published transaction has a static direct link in each language and browse axis', async () => {
  const catalog = JSON.parse(await read('transaction-discovery-data.json'));
  const coverage = JSON.parse(await read('artifacts/service-browse/coverage.json'));
  assert.equal(coverage.services, catalog.length);
  assert.equal(coverage.authorities, 21);
  assert.equal(coverage.emirates, 7);
  for (const locale of ['ar','en']) {
    const html = await read((locale==='en'?'en/':'')+'services/index.html');
    const hero = html.match(/<header\b[^>]*class="page-hero"[^>]*>[\s\S]*?<\/header>/)?.[0];
    assert.ok(hero, 'Directory intro header exists');
    assert.ok(!hero.includes('data-service-browse'), 'Browse panel must be outside the dark intro header');
    const nav = html.split('<!-- hb-browse:start -->')[1].split('<!-- hb-browse:end -->')[0];
    const ids = new Set([...nav.matchAll(/data-browse-service="([^"]+)"/g)].map(x=>x[1].replaceAll('&amp;','&')));
    assert.equal(ids.size, catalog.length);
    for (const record of coverage.records) {
      assert.ok(ids.has(record.id), record.id);
      assert.ok(nav.includes('href="'+record.routes[locale]+'"'), record.routes[locale]);
      assert.ok(record.browse.some(k=>k.startsWith('field-'))&&record.browse.some(k=>k.startsWith('action-'))&&record.browse.some(k=>k.startsWith('authority-')),record.id);
    }
  }
});
