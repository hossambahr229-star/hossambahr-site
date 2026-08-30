import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const sourceFile = resolve(root, 'content/government-updates.json');
const outputFile = resolve(root, 'government-updates-data.js');
const source = JSON.parse(await readFile(sourceFile, 'utf8'));
const required = ['id', 'title', 'authority', 'affectedServiceOrCategory', 'scope', 'summary', 'officialSourceUrl', 'verificationStatus', 'publishedAt'];
const allowedStatuses = new Set(['VERIFIED', 'PENDING_VERIFICATION']);
const allowedScopes = new Set(['FEDERAL', 'ABU_DHABI', 'DUBAI', 'SHARJAH', 'AJMAN', 'RAS_AL_KHAIMAH', 'UMM_AL_QUWAIN', 'FUJAIRAH']);
const failures = [];
const ids = new Set();

for (const update of source.updates || []) {
  for (const field of required) if (!update[field]) failures.push(`${update.id || '(missing id)'}: missing ${field}`);
  if (ids.has(update.id)) failures.push(`${update.id}: duplicate id`);
  ids.add(update.id);
  if (!allowedStatuses.has(update.verificationStatus)) failures.push(`${update.id}: invalid verificationStatus`);
  if (!allowedScopes.has(update.scope)) failures.push(`${update.id}: invalid scope`);
  if (!/^https:\/\//.test(update.officialSourceUrl || '')) failures.push(`${update.id}: official source must use HTTPS`);
  if (update.verificationStatus === 'VERIFIED' && !update.lastVerifiedAt) failures.push(`${update.id}: verified update needs lastVerifiedAt`);
}

if (failures.length) throw new Error(`Government updates validation failed:\n${failures.join('\n')}`);
await writeFile(outputFile, `window.HB_GOVERNMENT_UPDATES=${JSON.stringify(source.updates || [])};\n`, 'utf8');
console.log(JSON.stringify({ governmentUpdates: 'VALID', published: (source.updates || []).filter((item) => item.verificationStatus === 'VERIFIED').length }));
