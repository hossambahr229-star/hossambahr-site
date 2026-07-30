import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)));
const outputPath = path.join(root, 'external-link-monitor.json');
const audit = JSON.parse(fs.readFileSync(path.join(root, 'route-audit.json'), 'utf8'));
const unique = new Map(audit.external.map(entry => [entry.url, entry.references]));

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
const entries = [...unique.entries()];
for (let index = 0; index < entries.length; index += 6) {
  const batch = entries.slice(index, index + 6);
  checks.push(...await Promise.all(batch.map(async ([url, references]) => ({
    url, references, ...(await check(url))
  }))));
}

const report = {
  checkedAt: new Date().toISOString(),
  scannedReferences: [...unique.values()].reduce((total, references) => total + references, 0),
  uniqueUrls: checks.length,
  healthy: checks.filter(check => check.ok).length,
  failed: checks.filter(check => !check.ok).length,
  checks
};

fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({checkedAt: report.checkedAt, uniqueUrls: report.uniqueUrls, healthy: report.healthy, failed: report.failed}));
if (report.failed) process.exit(1);
