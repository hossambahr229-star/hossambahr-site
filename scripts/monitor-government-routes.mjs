import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = path.join(root, 'government-route-monitor-report.json');
const readJson = relative => JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));
const registries = [
  readJson('content/government-service-route-audit.json').records,
  readJson('content/platform-government-route-audit.json').records
];

const approved = registries.flat().filter(record => record.status === 'approved');
const unique = new Map();
for (const record of approved) {
  const url = record.startUrl || record.evidenceUrl;
  if (!unique.has(url)) unique.set(url, []);
  unique.get(url).push(record.slug || record.title);
}

async function check(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {'user-agent': 'HossamBahr-Government-Route-Monitor/1.0'}
    });
    return {
      ok: (response.status >= 200 && response.status < 400) || response.status === 401 || response.status === 403,
      status: response.status,
      finalUrl: response.url
    };
  } catch (error) {
    return {ok: false, status: 0, finalUrl: url, error: error.message};
  } finally {
    clearTimeout(timer);
  }
}

const checks = [];
for (const [url, services] of unique) {
  checks.push({url, services, ...(await check(url))});
}

const report = {
  checkedAt: new Date().toISOString(),
  approvedServiceRecords: approved.length,
  uniqueUrls: checks.length,
  healthy: checks.filter(check => check.ok).length,
  failed: checks.filter(check => !check.ok).length,
  checks
};

fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({checkedAt: report.checkedAt, uniqueUrls: report.uniqueUrls, healthy: report.healthy, failed: report.failed}));
if (report.failed) process.exit(1);
