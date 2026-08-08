import { access, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const registry = JSON.parse(await readFile(resolve(root, 'src/publication/det-publication-registry.json'), 'utf8'));
const errors = [];
let active = 0;
for (const service of registry.services) {
  const path = resolve(root, 'services', service.slug, 'index.html');
  try { await access(path); } catch { errors.push(`${service.slug}: missing internal route`); continue; }
  const html = await readFile(path, 'utf8');
  if (!html.includes('data-heritage-identity="f0de873"')) errors.push(`${service.slug}: historical identity marker missing`);
  if (!html.includes(`data-publication-state="${service.classification}"`)) errors.push(`${service.slug}: classification not rendered`);
  const activeLinks = [...html.matchAll(/<a\b[^>]*data-government-cta="verified"[^>]*href="([^"]+)"/gi)].map((match) => match[1]);
  active += activeLinks.length;
  if (service.classification === 'VERIFIED') {
    if (!service.officialUrl || activeLinks.length !== 1 || activeLinks[0] !== service.officialUrl) errors.push(`${service.slug}: verified CTA mismatch`);
    if (!/^https:\/\/(?:www\.)?(?:investindubai|dubaidet)\.gov\.ae\//.test(service.officialUrl ?? '')) errors.push(`${service.slug}: active CTA is outside an official DET domain`);
  } else {
    if (service.officialUrl !== null) errors.push(`${service.slug}: unverified service must not retain an official URL`);
    if (activeLinks.length) errors.push(`${service.slug}: unverified service exposes an active CTA`);
    if (!html.includes('disabled aria-disabled="true"')) errors.push(`${service.slug}: pending/broken CTA is not disabled`);
  }
  if (service.rejectedUrl && html.includes(service.rejectedUrl)) errors.push(`${service.slug}: rejected URL leaked into HTML`);
}
if (registry.services.length !== 15) errors.push(`DET gate requires 15 classified services; found ${registry.services.length}`);
const summary = {
  passed: errors.length === 0,
  authority: 'DET',
  total: registry.services.length,
  verified: registry.services.filter((item) => item.classification === 'VERIFIED').length,
  pendingVerification: registry.services.filter((item) => item.classification === 'PENDING_VERIFICATION').length,
  broken: registry.services.filter((item) => item.classification === 'BROKEN').length,
  activeGovernmentCtas: active,
  brokenActiveCtas: errors.filter((error) => /CTA|rejected URL|official URL/.test(error)).length,
  errors
};
await writeFile(resolve(root, 'reports/det-safe-publication-gate.json'), `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(summary, null, 2));
if (!summary.passed) process.exitCode = 1;
