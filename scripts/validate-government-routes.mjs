import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJson = relative => JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));
const errors = [];

const generatedAudit = readJson('content/government-service-route-audit.json');
const platformAudit = readJson('content/platform-government-route-audit.json');
const reviewLog = readJson('content/government-service-review-log.json');
const governmentTree = readJson('content/government-service-tree.json');

const context = { window: {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, 'platform-data.js'), 'utf8'), context);
vm.runInContext(fs.readFileSync(path.join(root, 'government-services-data.js'), 'utf8'), context);
const platformItems = context.window.HB_PLATFORM.services;
const directoryItems = Object.values(context.window.HB_DIRECTORIES).flatMap(directory => directory.items);
const exposedGovernmentItems = platformItems.filter(item => item.type !== 'guide');
const auditByTitle = new Map(platformAudit.records.map(record => [record.title, record]));

if (auditByTitle.size !== platformAudit.records.length) errors.push('Duplicate platform audit titles');
if (platformAudit.records.length !== exposedGovernmentItems.length) {
  errors.push(`Platform audit count ${platformAudit.records.length} does not match exposed count ${exposedGovernmentItems.length}`);
}

for (const item of exposedGovernmentItems) {
  const record = auditByTitle.get(item.title);
  if (!record) {
    errors.push(`Missing platform audit record: ${item.title}`);
    continue;
  }
  if (record.status === 'approved' && item.type !== 'direct') {
    errors.push(`Approved platform route is not direct: ${item.title}`);
  }
  if (record.status !== 'approved' && item.type !== 'blocked') {
    errors.push(`Unapproved platform route is not blocked: ${item.title}`);
  }
  const expectedUrl = record.startUrl || record.evidenceUrl;
  if (record.status === 'approved' && item.url !== expectedUrl && item.url !== record.evidenceUrl) {
    errors.push(`Approved platform URL mismatch: ${item.title}`);
  }
}

const requiredFields = ['status','finding','emirate','authority','sector','officialServiceName','audience','requestType','evidenceUrl','result','notes'];
for (const record of platformAudit.records) {
  for (const field of requiredFields) if (!record[field]) errors.push(`Missing ${field}: ${record.title}`);
}

const platformSource = fs.readFileSync(path.join(root, 'platform.js'), 'utf8');
const catalogSource = fs.readFileSync(path.join(root, 'uae-service-catalog.js'), 'utf8');
const directorySource = fs.readFileSync(path.join(root, 'service-directory.js'), 'utf8');
const legacySource = fs.readFileSync(path.join(root, 'service-page.js'), 'utf8');
if (!platformSource.includes('const publicServices = data.services;')) errors.push('Platform must expose all service records');
if (!catalogSource.includes('var publicServices=data.services;')) errors.push('Catalog must expose all service records');
if (!directorySource.includes('hasApprovedExactSource')) errors.push('Directory exact-route allowlist missing');
if (!legacySource.includes('const route=routeCandidate;')) errors.push('Legacy routes must remain publicly connected');
if (!directorySource.includes('var publicItems=config.items;')) errors.push('Directory must expose all service records');

const publicRoutePlaceholders = [
  'route-disabled',
  'route-blocked',
  'catalog-route-blocked',
  'directory-route-suspended',
  'official-link-suspended',
  'المسار الرسمي معلّق',
  'المسار الدقيق قيد التحقق',
];
for (const relative of ['platform.js','uae-service-catalog.js','service-directory.js','service-page.js','business-services-dubai.html']) {
  const source = fs.readFileSync(path.join(root, relative), 'utf8');
  for (const marker of publicRoutePlaceholders) {
    if (source.includes(marker)) errors.push(`Public route placeholder remains in ${relative}: ${marker}`);
  }
}

if (!Array.isArray(generatedAudit.records) || generatedAudit.records.length !== 31) {
  errors.push('Generated service audit must contain exactly 31 current guide records');
}
if (!Array.isArray(reviewLog.entries) || !reviewLog.entries.length) errors.push('Review log is empty');
if (!Array.isArray(governmentTree.services) || governmentTree.services.length !== governmentTree.summary.totalCanonicalRecords) {
  errors.push('Government tree summary does not match its service records');
}
for (const service of governmentTree.services) {
  if (service.status !== 'approved' && service.officialUrl !== null) {
    errors.push(`Suspended tree record exposes an official URL: ${service.id}`);
  }
  if (service.status === 'approved' && !service.officialUrl) {
    errors.push(`Approved tree record has no official URL: ${service.id}`);
  }
}

if (errors.length) {
  console.error(`Government route validation failed with ${errors.length} error(s):`);
  errors.forEach(error => console.error(`- ${error}`));
  process.exit(1);
}

const generatedApproved = generatedAudit.records.filter(record => record.status === 'approved').length;
const platformApproved = platformAudit.records.filter(record => record.status === 'approved').length;
console.log(`Government route validation passed: all ${generatedAudit.records.length} guides published (${generatedApproved} verified), all ${platformAudit.records.length} catalog records published (${platformApproved} verified), and all ${directoryItems.length} directory records exposed while atomic verification continues.`);
