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
      const response = await fetch(`${baseUrl}${route}${route.includes('?') ? '&' : '?'}release=${release}`, { redirect: 'follow', signal: AbortSignal.timeout(30000), headers: { 'cache-control': 'no-cache' } });
      const live = Buffer.from(await response.arrayBuffer());
      const localDigest = comparableDigest(local, route);
      const liveDigest = comparableDigest(live, route);
      if (response.status !== 200 || liveDigest !== localDigest) failures.push({ route, status: response.status, contentMatch: liveDigest === localDigest });
    } catch (error) {
      failures.push({ route, error: error?.cause?.code || error.name || error.message });
    }
  }
}
await Promise.all(Array.from({ length: 12 }, worker));
console.log(JSON.stringify({ production: 'BYTE_VERIFIED', baseUrl, routes: routes.length, passed: routes.length - failures.length, failed: failures.length, failures: failures.slice(0, 20) }));
if (failures.length) process.exitCode = 1;
