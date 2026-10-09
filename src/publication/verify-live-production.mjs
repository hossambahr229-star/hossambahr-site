import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const baseUrl = (process.env.HB_BASE_URL || 'https://hossambahr.com').replace(/\/$/, '');
const report = JSON.parse(await readFile(resolve(root, 'artifacts/a-plus-plus-global/route-audit.json'), 'utf8'));
const routes = report.matrix.map((entry) => entry.route);
const release = process.env.GITHUB_SHA || Date.now().toString();
const digest = (value) => createHash('sha256').update(value).digest('hex');
const comparableDigest = (value, route) => {
  if (!route.startsWith('/dashboard/')) return digest(value);
  const normalized = Buffer.from(value).toString('utf8')
    .replace(/آخر تحديث تلقائي:\s*[^<]+/g, 'آخر تحديث تلقائي: [BUILD_TIMESTAMP]');
  return digest(normalized);
};

function routeFile(route) {
  if (route === '/') return resolve(root, 'index.html');
  const relative = decodeURIComponent(route.replace(/^\//, ''));
  return resolve(root, relative.endsWith('/') ? `${relative}index.html` : relative);
}

function isPlatform404Route(route) {
  return route === '/404.html' || route === '/404/';
}

const localHome = await readFile(resolve(root, 'index.html'));
const expectedHomeHash = digest(localHome);
let liveHomeHash = '';
let liveHomeStatus = 0;
for (let attempt = 1; attempt <= 24; attempt += 1) {
  try {
    const response = await fetch(`${baseUrl}/?release=${release}&attempt=${attempt}`, { redirect: 'follow', signal: AbortSignal.timeout(30000), headers: { 'cache-control': 'no-cache' } });
    const body = Buffer.from(await response.arrayBuffer());
    liveHomeStatus = response.status;
    liveHomeHash = digest(body);
    if (response.status === 200 && liveHomeHash === expectedHomeHash) break;
  } catch {}
  await new Promise((done) => setTimeout(done, 15000));
}
if (liveHomeStatus !== 200 || liveHomeHash !== expectedHomeHash) {
  throw new Error(`Production did not reach the expected homepage bytes: status=${liveHomeStatus}, expected=${expectedHomeHash}, actual=${liveHomeHash}`);
}

const failures = [];
let cursor = 0;
async function worker() {
  while (cursor < routes.length) {
    const index = cursor;
    cursor += 1;
    const route = routes[index];
    try {
      const local = await readFile(routeFile(route));
      const localDigest = comparableDigest(local, route);
      let lastStatus = 0;
      let contentMatch = false;
      let lastError = null;

      for (let attempt = 1; attempt <= 24; attempt += 1) {
        try {
          const separator = route.includes('?') ? '&' : '?';
          const response = await fetch(
            `${baseUrl}${route}${separator}release=${release}&routeAttempt=${attempt}`,
            {
              redirect: 'follow',
              signal: AbortSignal.timeout(30000),
              headers: { 'cache-control': 'no-cache, no-store', pragma: 'no-cache' },
            },
          );
          const live = Buffer.from(await response.arrayBuffer());
          lastStatus = response.status;
          contentMatch = comparableDigest(live, route) === localDigest;
          lastError = null;

          if (response.status === 200 && (contentMatch || isPlatform404Route(route))) break;
        } catch (error) {
          lastError = error;
        }

        if (attempt < 24) await new Promise((done) => setTimeout(done, 15000));
      }

      // GitHub Pages can update edge objects shortly after the homepage flips to
      // a new deployment. Retry only stale/mismatched routes before declaring a
      // byte-verification failure so a short CDN propagation window is not
      // misreported as a production regression.
      if (lastError) {
        failures.push({ route, error: lastError?.cause?.code || lastError.name || lastError.message });
      } else if (lastStatus !== 200 || (!contentMatch && !isPlatform404Route(route))) {
        failures.push({ route, status: lastStatus, contentMatch });
      }
    } catch (error) {
      failures.push({ route, error: error?.cause?.code || error.name || error.message });
    }
  }
}
await Promise.all(Array.from({ length: 12 }, worker));
console.log(JSON.stringify({ production: failures.length ? 'BYTE_MISMATCH' : 'BYTE_VERIFIED', baseUrl, routes: routes.length, passed: routes.length - failures.length, failed: failures.length, failures: failures.slice(0, 20) }));
if (failures.length) process.exitCode = 1;
