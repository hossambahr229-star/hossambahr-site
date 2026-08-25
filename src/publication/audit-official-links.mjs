import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const registry = JSON.parse(await readFile(resolve(root, 'src/registry/published-services.json'), 'utf8'));
const timeoutMs = Number(process.env.HB_EXTERNAL_TIMEOUT_MS || 20000);
const concurrency = Number(process.env.HB_EXTERNAL_CONCURRENCY || 10);
const output = resolve(root, process.env.HB_EXTERNAL_AUDIT_OUTPUT || 'artifacts/official-links-audit.json');
const targets = new Map();

function addTarget(url, service, kind) {
  if (!url) return;
  if (!targets.has(url)) targets.set(url, { url, services: new Set(), kinds: new Set() });
  targets.get(url).services.add(service.slug);
  targets.get(url).kinds.add(kind);
}

for (const service of registry.services) {
  addTarget(service.officialInformationUrl, service, 'official-information');
  addTarget(service.officialCtaUrl, service, 'official-cta');
  const html = await readFile(resolve(root, `.${service.internalRoute}`, 'index.html'), 'utf8');
  for (const match of html.matchAll(/<a\b([^>]*(?:data-government-cta|data-transaction-id|official-card-reference|route-choice)[^>]*)>/gi)) {
    const href = match[1].match(/href=["']([^"']+)["']/i)?.[1]?.replaceAll('&amp;', '&');
    if (href?.startsWith('http')) addTarget(href, service, 'page-official-route');
  }
}

const queue = [...targets.values()].map((target) => ({
  ...target,
  services: [...target.services],
  kinds: [...target.kinds],
}));
const results = new Array(queue.length);
let cursor = 0;

async function inspect(target) {
  let parsed;
  try {
    parsed = new URL(target.url);
  } catch (error) {
    return { ...target, result: 'BROKEN', reason: `invalid URL: ${error.message}` };
  }
  if (parsed.protocol !== 'https:') return { ...target, result: 'BROKEN', reason: `non-HTTPS official URL: ${parsed.protocol}` };
  try {
    const response = await fetch(target.url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(timeoutMs),
      headers: {
        'user-agent': 'HossamBahr-Official-Link-Audit/1.0 (+https://hossambahr.com/methodology/)',
        accept: 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
      },
    });
    const finalUrl = response.url || target.url;
    if ([404, 410].includes(response.status)) return { ...target, status: response.status, finalUrl, result: 'BROKEN', reason: 'proven missing destination' };
    if (response.status >= 200 && response.status < 400) return { ...target, status: response.status, finalUrl, result: 'REACHABLE' };
    if ([401, 403, 405, 406, 409, 429].includes(response.status)) return { ...target, status: response.status, finalUrl, result: 'ACCESS_RESTRICTED', reason: 'official server rejected automated audit traffic' };
    return { ...target, status: response.status, finalUrl, result: 'TEMPORARILY_UNAVAILABLE', reason: `HTTP ${response.status}` };
  } catch (error) {
    return { ...target, result: 'NETWORK_UNVERIFIED', reason: error?.cause?.code || error.name || error.message };
  }
}

async function worker() {
  while (cursor < queue.length) {
    const index = cursor;
    cursor += 1;
    results[index] = await inspect(queue[index]);
  }
}

await Promise.all(Array.from({ length: Math.min(concurrency, queue.length) }, worker));
const counts = Object.fromEntries(['REACHABLE', 'ACCESS_RESTRICTED', 'TEMPORARILY_UNAVAILABLE', 'NETWORK_UNVERIFIED', 'BROKEN'].map((state) => [state, results.filter((item) => item.result === state).length]));
const report = {
  generatedAt: new Date().toISOString(),
  services: registry.services.length,
  uniqueOfficialUrls: queue.length,
  counts,
  provenBroken: results.filter((item) => item.result === 'BROKEN'),
  results,
};
await writeFile(output, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ officialLinks: 'AUDITED', services: report.services, uniqueOfficialUrls: report.uniqueOfficialUrls, ...counts }));
if (report.provenBroken.length) console.error(JSON.stringify({ provenBroken: report.provenBroken }, null, 2));
if (counts.BROKEN) process.exitCode = 1;
