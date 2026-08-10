import { access, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const registry = JSON.parse(await readFile(resolve(root, 'src/publication/det-publication-registry.json'), 'utf8'));
const canonical = JSON.parse(await readFile(resolve(root, 'src/registry/registry.json'), 'utf8'));
const matrix = JSON.parse(await readFile(resolve(root, 'service-matrix.json'), 'utf8'));
const gdrfaAudit = JSON.parse(await readFile(resolve(root, 'content/gdrfa-dubai-deep-audit.json'), 'utf8'));
const mohreAudit = JSON.parse(await readFile(resolve(root, 'content/mohre-deep-audit.json'), 'utf8'));
const icpAudit = JSON.parse(await readFile(resolve(root, 'content/icp-deep-audit.json'), 'utf8'));
const dubaiCoverage = JSON.parse(await readFile(resolve(root, 'content/dubai-coverage-expansion.json'), 'utf8'));
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
const normalizedGdrfaIds = new Set(gdrfaAudit.normalizations.map((record) => record.sourceId));
const verifiedGdrfaIds = new Set(gdrfaAudit.verifiedRecords.map((record) => record.id));
const gdrfaServices = matrix.services.filter((service) => service.authority.slug === 'gdrfa-dubai');
for (const service of gdrfaServices) {
  const path = resolve(root, service.internalUrl.replace(/^\/+/, ''), 'index.html');
  try { await access(path); } catch { errors.push(`${service.slug}: missing GDRFA internal route`); continue; }
  const html = await readFile(path, 'utf8');
  const activeLinks = [...html.matchAll(/<a\b[^>]*data-government-cta="verified"[^>]*href="([^"]+)"/gi)].map((match) => match[1]);
  if (!html.includes('data-heritage-identity="f0de873"')) errors.push(`${service.slug}: GDRFA historical identity marker missing`);
  if (normalizedGdrfaIds.has(service.id)) {
    if (activeLinks.length) errors.push(`${service.slug}: normalized GDRFA sub-service exposes an active CTA`);
    if (!html.includes('data-gdrfa-audit-state="SUB_SERVICE"')) errors.push(`${service.slug}: GDRFA sub-service normalization marker missing`);
  } else {
    if (!verifiedGdrfaIds.has(service.id)) errors.push(`${service.slug}: GDRFA service is absent from the official audit`);
    if (activeLinks.length !== 1 || activeLinks[0] !== service.officialUrl) errors.push(`${service.slug}: GDRFA verified CTA mismatch`);
    try {
      const hostname = new URL(service.officialUrl).hostname;
      if (!(hostname === 'gdrfad.gov.ae' || hostname.endsWith('.gdrfad.gov.ae'))) errors.push(`${service.slug}: GDRFA CTA is outside the official domain`);
    } catch { errors.push(`${service.slug}: GDRFA CTA is not an absolute URL`); }
  }
}
const realGdrfaCount = gdrfaServices.length - normalizedGdrfaIds.size;
if (realGdrfaCount !== gdrfaAudit.summary.realServices) errors.push(`GDRFA real-service denominator mismatch: ${realGdrfaCount}`);
const normalizedMohreIds = new Set(mohreAudit.normalizations.map((record) => record.sourceId));
const mohreLegacy = matrix.services.filter((service) => service.authority.slug === 'mohre');
for (const service of mohreLegacy) {
  const path = resolve(root, service.internalUrl.replace(/^\/+/, ''), 'index.html');
  try { await access(path); } catch { errors.push(`${service.slug}: missing MOHRE internal route`); continue; }
  const html = await readFile(path, 'utf8');
  const activeLinks = [...html.matchAll(/<a\b[^>]*data-government-cta="verified"[^>]*href="([^"]+)"/gi)].map((match) => match[1]);
  if (!html.includes('data-heritage-identity=')) errors.push(`${service.slug}: MOHRE historical identity marker missing`);
  if (normalizedMohreIds.has(service.id)) {
    if (activeLinks.length) errors.push(`${service.slug}: normalized MOHRE record exposes an active CTA`);
    if (!html.includes('data-publication-state="NORMALIZED"')) errors.push(`${service.slug}: MOHRE normalization marker missing`);
  }
}
for (const service of mohreAudit.newVerifiedServices) {
  const path = resolve(root, 'services', service.slug, 'index.html');
  try { await access(path); } catch { errors.push(`${service.slug}: missing new MOHRE internal route`); continue; }
  const html = await readFile(path, 'utf8');
  const activeLinks = [...html.matchAll(/<a\b[^>]*data-government-cta="verified"[^>]*href="([^"]+)"/gi)].map((match) => match[1]);
  if (!html.includes('data-heritage-identity="f0de873"')) errors.push(`${service.slug}: MOHRE historical identity marker missing`);
  if (activeLinks.length !== 1 || activeLinks[0] !== service.officialUrl) errors.push(`${service.slug}: MOHRE verified CTA mismatch`);
  try {
    const hostname = new URL(service.officialUrl).hostname;
    if (!(hostname === 'mohre.gov.ae' || hostname.endsWith('.mohre.gov.ae'))) errors.push(`${service.slug}: MOHRE CTA is outside the official domain`);
  } catch { errors.push(`${service.slug}: MOHRE CTA is not an absolute URL`); }
}
const realMohreCount = mohreLegacy.length - normalizedMohreIds.size + mohreAudit.newVerifiedServices.length;
if (realMohreCount !== mohreAudit.summary.realServices) errors.push(`MOHRE real-service denominator mismatch: ${realMohreCount}`);
const icpLegacy = matrix.services.filter((service) => service.authority.slug === 'icp');
for (const service of icpAudit.newVerifiedServices) {
  const path = resolve(root, 'services', service.slug, 'index.html');
  try { await access(path); } catch { errors.push(`${service.slug}: missing new ICP internal route`); continue; }
  const html = await readFile(path, 'utf8');
  const activeLinks = [...html.matchAll(/<a\b[^>]*data-government-cta="verified"[^>]*href="([^"]+)"/gi)].map((match) => match[1]);
  if (!html.includes('data-heritage-identity=')) errors.push(`${service.slug}: ICP historical identity marker missing`);
  if (activeLinks.length !== 1 || activeLinks[0] !== service.officialUrl) errors.push(`${service.slug}: ICP verified CTA mismatch`);
  try {
    const hostname = new URL(service.officialUrl).hostname;
    if (!(hostname === 'icp.gov.ae' || hostname.endsWith('.icp.gov.ae'))) errors.push(`${service.slug}: ICP CTA is outside the official domain`);
  } catch { errors.push(`${service.slug}: ICP CTA is not an absolute URL`); }
}
const realIcpCount = icpLegacy.length + icpAudit.newVerifiedServices.length;
if (realIcpCount !== icpAudit.summary.realServices) errors.push(`ICP real-service denominator mismatch: ${realIcpCount}`);
for (const authority of dubaiCoverage.authorities) {
  const canonicalCount = canonical.services.filter((service) => service.authorityId === authority.id).length;
  if (canonicalCount !== authority.summary.canonicalServices) errors.push(`${authority.id}: canonical service count mismatch`);
  for (const service of authority.newVerifiedServices) {
    const path = resolve(root, 'services', service.slug, 'index.html');
    try { await access(path); } catch { errors.push(`${service.slug}: missing Dubai authority route`); continue; }
    const html = await readFile(path, 'utf8');
    const activeLinks = [...html.matchAll(/<a\b[^>]*data-government-cta="verified"[^>]*href="([^"]+)"/gi)].map((match) => match[1]);
    if (!html.includes('data-heritage-identity=')) errors.push(`${service.slug}: Dubai historical identity marker missing`);
    if (activeLinks.length !== 1 || activeLinks[0] !== service.officialUrl) errors.push(`${service.slug}: Dubai authority CTA mismatch`);
    try {
      const hostname = new URL(service.officialUrl).hostname;
      if (!authority.officialDomains.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`))) errors.push(`${service.slug}: CTA outside ${authority.id} official domains`);
    } catch { errors.push(`${service.slug}: Dubai authority CTA is not an absolute URL`); }
  }
  if (canonicalCount + authority.newVerifiedServices.length !== authority.summary.realServices) errors.push(`${authority.id}: real-service denominator mismatch`);
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
  gdrfa: {
    records: gdrfaServices.length,
    realServices: realGdrfaCount,
    verified: verifiedGdrfaIds.size,
    normalizedHistoricalRecords: normalizedGdrfaIds.size,
    pendingVerification: gdrfaAudit.summary.pendingVerification
  },
  mohre: {
    records: mohreLegacy.length,
    realServices: realMohreCount,
    verified: mohreAudit.summary.verifiedRealServices,
    normalizedHistoricalRecords: normalizedMohreIds.size,
    additions: mohreAudit.newVerifiedServices.length,
    pendingVerification: mohreAudit.summary.pendingVerification
  },
  icp: {
    records: icpLegacy.length,
    realServices: realIcpCount,
    verified: icpAudit.summary.verifiedRealServices,
    additions: icpAudit.newVerifiedServices.length,
    pendingVerification: icpAudit.summary.pendingVerification
  },
  dubaiCoverage: Object.fromEntries(dubaiCoverage.authorities.map((authority) => [authority.id, authority.summary])),
  errors
};
await writeFile(resolve(root, 'reports/det-safe-publication-gate.json'), `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(summary, null, 2));
if (!summary.passed) process.exitCode = 1;
