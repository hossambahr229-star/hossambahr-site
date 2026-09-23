import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

test('authentication scripts bypass the service-worker cache, including versioned URLs', () => {
  const handlers = {};
  vm.runInNewContext(readFileSync(new URL('../../sw.js', import.meta.url), 'utf8'), {
    self: { location: { origin: 'https://example.invalid' }, addEventListener: (name, handler) => { handlers[name] = handler; } },
    URL,
    caches: { match: () => new Promise(() => {}) }
  });
  for (const path of ['/auth-client.js', '/auth-config.js', '/vendor/supabase.js', '/auth-client.js?v=release', '/auth/']) {
    let intercepted = false;
    handlers.fetch({ request: { method: 'GET', url: `https://example.invalid${path}`, destination: 'script' }, respondWith() { intercepted = true; } });
    assert.equal(intercepted, false, `${path} must use the browser network path`);
  }
  let cached = false;
  handlers.fetch({ request: { method: 'GET', url: 'https://example.invalid/public.js', destination: 'script' }, respondWith() { cached = true; } });
  assert.equal(cached, true, 'public assets retain offline caching');
});
