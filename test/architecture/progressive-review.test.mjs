import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { validateProgressiveReview } from '../../src/review/progressive-review-validator.mjs';

const candidates = JSON.parse(await readFile(new URL('../../src/review/service-review-inventory.json', import.meta.url), 'utf8'));
const references = JSON.parse(await readFile(new URL('../../src/review/reference-review-inventory.json', import.meta.url), 'utf8'));
const state = JSON.parse(await readFile(new URL('../../src/review/progressive-review-state.json', import.meta.url), 'utf8'));
const dossierTemplate = JSON.parse(await readFile(new URL('../../src/review/templates/service-review-dossier.json', import.meta.url), 'utf8'));
const activeDossier = JSON.parse(await readFile(new URL('../../src/review/dossiers/reserve-trade-name-dubai.json', import.meta.url), 'utf8'));

function validate(overrides = {}) {
  return validateProgressiveReview({
    state: structuredClone(state),
    inventory: candidates,
    dossiers: [structuredClone(activeDossier)],
    registry: { services: [] },
    businessEvaluation: { serviceResults: [] },
    ...overrides
  });
}

test('all legacy records are represented once in the non-publishable review inventory', () => {
  assert.equal(candidates.summary.sourceRecords, 172);
  assert.equal(candidates.summary.candidates, 172);
  assert.equal(new Set(candidates.candidates.map((item) => item.legacyId)).size, 172);
  assert.deepEqual(candidates.summary.duplicateIds, []);
  assert.deepEqual(candidates.summary.duplicateSlugs, []);
});

test('review inventory cannot silently publish legacy approvals', () => {
  assert.equal(candidates.summary.publishable, 0);
  assert.equal(candidates.policy.legacyApprovalImportedAsVerification, false);
  assert.equal(candidates.policy.bulkApprovalAllowed, false);
  assert.equal(candidates.policy.serviceEntityAllowedBeforeApproval, false);
  assert.equal(candidates.candidates.every((item) => item.publishable === false), true);
});

test('every candidate reports explicit blockers and source pointers', () => {
  assert.equal(candidates.candidates.every((item) => item.blockingFields.length > 0), true);
  assert.equal(candidates.candidates.every((item) => item.sourcePointers.primary), true);
});

test('legacy reference labels are quarantined instead of becoming canonical catalogs', () => {
  assert.equal(references.summary.legacyAuthorityLabels, 49);
  assert.equal(references.summary.legacyEmirateLabels, 11);
  assert.equal(references.summary.legacySectorLabels, 44);
  assert.equal(references.summary.sectorsWithAmbiguousMainCategories > 0, true);
  assert.equal(references.summary.sectorsWithoutObservedMainCategory > 0, true);
  assert.equal(references.authorities.every((item) => item.publishable === false), true);
  assert.equal(references.emirates.every((item) => item.publishable === false), true);
  assert.equal(references.sectors.every((item) => item.publishable === false), true);
});

test('DET is the only active authority and its full 15-service scope is fixed', () => {
  const result = validate();
  assert.equal(result.valid, true);
  assert.equal(result.activeAuthorityId, 'det');
  assert.equal(result.activeAuthorityExpectedServices, 15);
  assert.equal(result.activeAuthorityApprovedServices, 1);
  assert.equal(result.activeAuthorityRegisteredServices, 0);
  assert.equal(result.lockedAuthorities, 8);
});

test('a dossier for a locked authority is rejected', () => {
  const mohreCandidate = candidates.candidates.find((candidate) => candidate.businessDimensions.authorityGroup.startsWith('mohre '));
  const dossier = structuredClone(dossierTemplate);
  dossier.legacyId = mohreCandidate.legacyId;
  dossier.candidateId = mohreCandidate.candidateId;
  dossier.targetServiceId = mohreCandidate.candidateId;
  dossier.authorityId = 'mohre';
  const result = validate({ dossiers: [dossier] });
  assert.equal(result.valid, false);
  assert.equal(result.errors.some((error) => error.message.includes('locked authorities')), true);
});

test('bulk review cannot be enabled', () => {
  const invalidState = structuredClone(state);
  invalidState.bulkReviewAllowed = true;
  assert.equal(validate({ state: invalidState }).valid, false);
});

test('a later DET service cannot be reviewed before the active service', () => {
  const laterCandidate = candidates.candidates.find((candidate) => candidate.legacyId === 'guide:amend-business-license-dubai');
  const dossier = structuredClone(dossierTemplate);
  dossier.legacyId = laterCandidate.legacyId;
  dossier.candidateId = laterCandidate.candidateId;
  dossier.targetServiceId = laterCandidate.candidateId;
  const result = validate({ dossiers: [dossier] });
  assert.equal(result.valid, false);
  assert.equal(result.errors.some((error) => error.message.includes('later services are locked')), true);
});

test('review checks cannot pass out of order', () => {
  const activeCandidate = candidates.candidates.find((candidate) => candidate.legacyId === state.activeServiceLegacyId);
  const dossier = structuredClone(dossierTemplate);
  dossier.legacyId = activeCandidate.legacyId;
  dossier.candidateId = activeCandidate.candidateId;
  dossier.targetServiceId = activeCandidate.candidateId;
  dossier.status = 'in-review';
  dossier.checks[1].status = 'passed';
  dossier.checks[1].reviewedAt = '2026-08-01T01:00:00+04:00';
  dossier.checks[1].evidence = [{ type: 'official-source', value: 'evidence/authority.html', capturedAt: '2026-08-01T01:00:00+04:00' }];
  const result = validate({ dossiers: [dossier] });
  assert.equal(result.valid, false);
  assert.equal(result.errors.some((error) => error.message.includes('strictly in order')), true);
});

test('a passed review check must preserve its approved structured values', () => {
  const dossier = structuredClone(activeDossier);
  delete dossier.reviewedData.category;
  const result = validate({ dossiers: [dossier] });
  assert.equal(result.valid, false);
  assert.equal(result.errors.some((error) => error.path.endsWith('reviewedData.category')), true);
});

test('active service cannot advance before the previous service dossier is approved', () => {
  const invalidState = structuredClone(state);
  invalidState.activeServiceLegacyId = 'guide:amend-business-license-dubai';
  const result = validate({ state: invalidState });
  assert.equal(result.valid, false);
  assert.equal(result.errors.some((error) => error.message.includes('previous service dossier is approved')), true);
});

test('a Service Entity cannot enter the registry before individual approval', () => {
  const detCandidate = candidates.candidates.find((candidate) => candidate.legacyId === 'guide:initial-approval-dubai');
  const result = validate({
    registry: { services: [{ id: detCandidate.candidateId, authorityId: 'det', sourceLegacyIds: [detCandidate.legacyId] }] }
  });
  assert.equal(result.valid, false);
  assert.equal(result.errors.some((error) => error.message.includes('forbidden before individual dossier approval')), true);
});

test('the next authority cannot unlock while any DET service remains incomplete', () => {
  const invalidState = structuredClone(state);
  invalidState.activeAuthorityId = 'mohre';
  invalidState.authorityQueue[0].status = 'complete';
  invalidState.authorityQueue[0].completedAt = '2026-08-01T01:00:00+04:00';
  invalidState.authorityQueue[1].status = 'in-review';
  invalidState.authorityQueue[1].startedAt = '2026-08-01T01:00:00+04:00';
  const result = validate({ state: invalidState });
  assert.equal(result.valid, false);
  assert.equal(result.errors.some((error) => error.message.includes('completed authority still has')), true);
});
