import { access, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const registry = JSON.parse(await readFile(resolve(root, 'src/publication/det-publication-registry.json'), 'utf8'));
const canonical = JSON.parse(await readFile(resolve(root, 'src/registry/registry.json'), 'utf8'));
const authorities = JSON.parse(await readFile(resolve(root, 'src/registry/authorities.json'), 'utf8'));
const authorityById = new Map(authorities.authorities.map((authority) => [authority.id, authority]));
const errors = [];
const activeRecords = registry.services.filter((service) => !service.normalization?.excludeFromRealTotal);
let active = 0;
for (const service of registry.services) {
  const path = resolve(root, 'services', service.slug, 'index.html');
  try { await access(path); } catch { errors.push(`${service.slug}: missing internal route`); continue; }
  const html = await readFile(path, 'utf8');
  if (!html.includes('data-heritage-identity="f0de873"')) errors.push(`${service.slug}: historical identity marker missing`);
  if (!html.includes(`data-publication-state="${service.classification}"`)) errors.push(`${service.slug}: classification not rendered`);
  const activeLinks = [...html.matchAll(/<a\b[^>]*data-government-cta="verified"[^>]*href="([^"]+)"/gi)].map((match) => match[1]);
  active += activeLinks.length;
  if (service.normalization?.excludeFromRealTotal) {
    if (service.officialUrl !== null) errors.push(`${service.slug}: normalized historical record must not retain an official URL`);
    if (activeLinks.length) errors.push(`${service.slug}: normalized historical record exposes an active CTA`);
    if (!html.includes(`data-normalization-resolution="${service.normalization.resolution}"`)) errors.push(`${service.slug}: normalization resolution not rendered`);
    if (!service.normalization.resolvedInto?.length) errors.push(`${service.slug}: normalization has no resolved targets`);
  } else if (service.classification === 'VERIFIED') {
    if (!service.officialUrl || activeLinks.length !== 1 || activeLinks[0] !== service.officialUrl) errors.push(`${service.slug}: verified CTA mismatch`);
    if (!/^https:\/\/(?:www\.)?(?:investindubai|dubaidet)\.gov\.ae\//.test(service.officialUrl ?? '')) errors.push(`${service.slug}: active CTA is outside an official DET domain`);
  } else {
    if (service.officialUrl !== null) errors.push(`${service.slug}: unverified service must not retain an official URL`);
    if (activeLinks.length) errors.push(`${service.slug}: unverified service exposes an active CTA`);
    if (!html.includes('disabled aria-disabled="true"')) errors.push(`${service.slug}: pending/broken CTA is not disabled`);
  }
  if (service.rejectedUrl && html.includes(service.rejectedUrl)) errors.push(`${service.slug}: rejected URL leaked into HTML`);
}
for (const service of canonical.services) {
  const path = resolve(root, 'services', service.slug, 'index.html');
  try { await access(path); } catch { errors.push(`${service.slug}: missing canonical internal route`); continue; }
  const html = await readFile(path, 'utf8');
  if (!html.includes('data-heritage-identity="f0de873"')) errors.push(`${service.slug}: historical identity marker missing`);
  if (!html.includes(`data-canonical-service-id="${service.id}"`)) errors.push(`${service.slug}: canonical service marker missing`);
  const activeLinks = [...html.matchAll(/<a\b[^>]*data-government-cta="verified"[^>]*href="([^"]+)"/gi)].map((match) => match[1]);
  active += activeLinks.length;
  if (activeLinks.length !== 1 || activeLinks[0] !== service.officialGovernmentLink.url) errors.push(`${service.slug}: canonical verified CTA mismatch`);
  const allowedDomains = authorityById.get(service.authorityId)?.officialDomains ?? [];
  try {
    const hostname = new URL(service.officialGovernmentLink.url).hostname;
    if (!allowedDomains.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`))) errors.push(`${service.slug}: canonical CTA is outside the authority domains`);
  } catch { errors.push(`${service.slug}: canonical CTA is not an absolute URL`); }
}
if (!activeRecords.length) errors.push('DET real-service registry is empty');
const summary = {
  passed: errors.length === 0,
  authority: 'DET',
  total: activeRecords.length,
  records: registry.services.length,
  normalizedHistoricalRecords: registry.services.length - activeRecords.length,
  canonicalVerified: canonical.services.length,
  verified: activeRecords.filter((item) => item.classification === 'VERIFIED').length,
  pendingVerification: activeRecords.filter((item) => item.classification === 'PENDING_VERIFICATION').length,
  broken: activeRecords.filter((item) => item.classification === 'BROKEN').length,
  activeGovernmentCtas: active,
  brokenActiveCtas: errors.filter((error) => /CTA|rejected URL|official URL/.test(error)).length,
  errors
};
await writeFile(resolve(root, 'reports/det-safe-publication-gate.json'), `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(summary, null, 2));
if (!summary.passed) process.exitCode = 1;
