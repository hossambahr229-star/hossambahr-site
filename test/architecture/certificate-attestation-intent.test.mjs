import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { discoverServices } from '../../transaction-discovery.js';

const records = JSON.parse(await readFile(new URL('../../transaction-discovery-data.json', import.meta.url), 'utf8'));
const personal = 'تصديق-مستند-شخصي-داخل-الإمارات';
const cases = [
  ['تصديق الشهادات', personal],
  ['تصديق شهادة جامعية في دبي', personal],
  ['Degree attestation', personal],
  ['Attesting a diploma in Sharjah', personal],
  ['Confirming the Authenticity of Equivalency', 'confirming-the-authenticity-of-equivalency'],
  ['Attestation of commercial invoices via eDAS 2.0', 'attestation-of-commercial-invoices-via-edas-2-0'],
];

for (const [query, expected] of cases) {
  test(query, () => assert.deepEqual(discoverServices(records, { query }).map(row => row.s), [expected]));
}
test('certificate attestation respects an explicitly selected authority', () => {
  assert.deepEqual(discoverServices(records, { query: 'degree attestation', authority: 'moe' }), []);
});
