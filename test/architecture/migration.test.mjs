import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const candidates = JSON.parse(await readFile(new URL('../../src/migration/legacy-candidates.json', import.meta.url), 'utf8'));

test('all legacy records are represented once in migration staging', () => {
  assert.equal(candidates.summary.sourceRecords, 172);
  assert.equal(candidates.summary.candidates, 172);
  assert.equal(new Set(candidates.candidates.map((item) => item.legacyId)).size, 172);
  assert.deepEqual(candidates.summary.duplicateIds, []);
  assert.deepEqual(candidates.summary.duplicateSlugs, []);
});

test('migration staging cannot silently publish legacy approvals', () => {
  assert.equal(candidates.summary.publishable, 0);
  assert.equal(candidates.policy.legacyApprovalImportedAsVerification, false);
  assert.equal(candidates.candidates.every((item) => item.publishable === false), true);
});

test('every candidate reports explicit blockers and source pointers', () => {
  assert.equal(candidates.candidates.every((item) => item.blockingFields.length > 0), true);
  assert.equal(candidates.candidates.every((item) => item.sourcePointers.primary), true);
});
