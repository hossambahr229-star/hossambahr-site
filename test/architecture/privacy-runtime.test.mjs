import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');

test('privacy page loads the disclosure runtime exactly once', async () => {
  const html = await readFile(resolve(root, 'privacy/index.html'), 'utf8');
  const runtimeTags = html.match(/src=["']\/privacy-disclosure\.js(?:\?[^"']*)?["']/g) || [];
  assert.equal(runtimeTags.length, 1);
  assert.match(html, /data-hb-analytics-disclosure=["']v2["']/);
});
