export const REQUIRED_REVIEW_CHECKS = Object.freeze([
  'name',
  'classification',
  'emirate',
  'government-authority',
  'economic-activity',
  'license-type',
  'customer-type',
  'content',
  'documents',
  'fees',
  'completion-time',
  'faq',
  'keywords',
  'related-services',
  'alternative-services',
  'government-link-live-test',
  'search',
  'category-access',
  'homepage-access',
  'user-experience',
  'final-approval'
]);

function issue(errors, path, message) {
  errors.push({ path, message });
}

function authorityCandidates(inventory, authorityId) {
  return inventory.candidates.filter((candidate) => candidate.businessDimensions.authorityGroup.startsWith(`${authorityId} `));
}

const REQUIRED_REVIEWED_DATA = Object.freeze({
  name: ['name'],
  classification: ['category'],
  emirate: ['emirateId'],
  'government-authority': ['authorityId'],
  'economic-activity': ['activityIds'],
  'license-type': ['licenseTypeIds'],
  'customer-type': ['customerTypeIds'],
  content: ['content'],
  documents: ['documents'],
  fees: ['governmentFees', 'serviceFees'],
  'completion-time': ['duration'],
  faq: ['faq'],
  keywords: ['keywords'],
  'related-services': ['relatedServiceIds'],
  'alternative-services': ['alternativeServiceIds'],
  'government-link-live-test': ['officialGovernmentLink']
});

function hasReviewedValue(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return true;
  if (typeof value === 'object') return Object.keys(value).length > 0;
  return true;
}

export function validateProgressiveReview({ state, inventory, dossiers, registry, businessEvaluation }) {
  const errors = [];
  const queue = state.authorityQueue ?? [];
  const activeEntries = queue.filter((entry) => entry.status === 'in-review');
  const active = activeEntries[0];
  const queueIds = queue.map((entry) => entry.authorityId);
  const dossierByLegacyId = new Map();
  const dossierByTargetId = new Map();
  const serviceById = new Map((registry.services ?? []).map((service) => [service.id, service]));
  const acceptedServiceIds = new Set((businessEvaluation.serviceResults ?? []).filter((result) => result.accepted).map((result) => result.id));

  if (state.mode !== 'progressive-authority-atomic') issue(errors, 'mode', 'progressive authority-atomic mode is required');
  if (state.bulkReviewAllowed !== false) issue(errors, 'bulkReviewAllowed', 'bulk review must remain disabled');
  if (state.bulkRegistryInsertionAllowed !== false) issue(errors, 'bulkRegistryInsertionAllowed', 'bulk registry insertion must remain disabled');
  if (activeEntries.length !== 1) issue(errors, 'authorityQueue', 'exactly one authority must be in-review');
  if (active?.authorityId !== state.activeAuthorityId) issue(errors, 'activeAuthorityId', 'must match the single in-review authority');
  if (queue.length !== new Set(queueIds).size) issue(errors, 'authorityQueue', 'authority IDs must be unique');

  queue.forEach((entry, index) => {
    if (entry.order !== index + 1) issue(errors, `authorityQueue[${index}].order`, 'queue order must be contiguous');
    if (!active) return;
    if (index < active.order - 1 && entry.status !== 'complete') issue(errors, `authorityQueue[${index}].status`, 'authority before active scope must be complete');
    if (index === active.order - 1 && entry.status !== 'in-review') issue(errors, `authorityQueue[${index}].status`, 'active authority must be in-review');
    if (index > active.order - 1 && entry.status !== 'locked') issue(errors, `authorityQueue[${index}].status`, 'authority after active scope must remain locked');
  });

  const activeCandidates = active ? authorityCandidates(inventory, active.authorityId) : [];
  const activeCandidateIds = new Set(activeCandidates.map((candidate) => candidate.legacyId));
  const activeServiceOrder = active?.serviceReviewOrder ?? [];
  if (active) {
    if (activeServiceOrder.length !== activeCandidates.length || activeServiceOrder.some((legacyId) => !activeCandidateIds.has(legacyId))) {
      issue(errors, 'authorityQueue.serviceReviewOrder', 'active authority service order must contain every inventoried service exactly once');
    }
    if (new Set(activeServiceOrder).size !== activeServiceOrder.length) issue(errors, 'authorityQueue.serviceReviewOrder', 'service review order cannot contain duplicates');
    if (!activeServiceOrder.includes(state.activeServiceLegacyId)) issue(errors, 'activeServiceLegacyId', 'must identify one service in the active authority order');
  }
  const activeServiceIndex = activeServiceOrder.indexOf(state.activeServiceLegacyId);

  for (const [index, dossier] of dossiers.entries()) {
    const base = `dossiers[${index}]`;
    if (dossierByLegacyId.has(dossier.legacyId)) issue(errors, `${base}.legacyId`, 'only one dossier is allowed per service');
    if (dossierByTargetId.has(dossier.targetServiceId)) issue(errors, `${base}.targetServiceId`, 'target Service Entity ID must be unique');
    dossierByLegacyId.set(dossier.legacyId, dossier);
    dossierByTargetId.set(dossier.targetServiceId, dossier);

    const queueEntry = queue.find((entry) => entry.authorityId === dossier.authorityId);
    if (!queueEntry) issue(errors, `${base}.authorityId`, 'authority is not in the controlled review queue');
    if (!['in-review', 'complete'].includes(queueEntry?.status)) issue(errors, `${base}.authorityId`, 'dossiers for locked authorities are forbidden');

    const candidate = inventory.candidates.find((item) => item.legacyId === dossier.legacyId);
    if (!candidate) issue(errors, `${base}.legacyId`, 'service is absent from the review inventory');
    if (candidate && candidate.candidateId !== dossier.candidateId) issue(errors, `${base}.candidateId`, 'does not match the review inventory');
    if (candidate && !candidate.businessDimensions.authorityGroup.startsWith(`${dossier.authorityId} `)) {
      issue(errors, `${base}.authorityId`, 'service does not belong to this authority review scope');
    }

    if (dossier.authorityId === state.activeAuthorityId) {
      const dossierServiceIndex = activeServiceOrder.indexOf(dossier.legacyId);
      if (dossierServiceIndex > activeServiceIndex) issue(errors, `${base}.legacyId`, 'later services are locked until the active service dossier is approved');
      if (dossierServiceIndex < activeServiceIndex && dossier.status !== 'approved') issue(errors, `${base}.status`, 'earlier service must already be approved');
    }

    const checkIds = (dossier.checks ?? []).map((check) => check.id);
    if (checkIds.join('|') !== REQUIRED_REVIEW_CHECKS.join('|')) issue(errors, `${base}.checks`, 'all 21 checks must exist in the required order');
    let priorCheckPassed = true;
    for (const [checkIndex, check] of (dossier.checks ?? []).entries()) {
      if (check.status === 'passed' && !priorCheckPassed) issue(errors, `${base}.checks[${checkIndex}]`, 'review checks must pass strictly in order');
      if (check.status === 'passed' && (!check.reviewedAt || !(check.evidence ?? []).length)) issue(errors, `${base}.checks[${checkIndex}]`, 'passed check requires review time and evidence');
      if (check.status === 'pending' && (check.reviewedAt || (check.evidence ?? []).length)) issue(errors, `${base}.checks[${checkIndex}]`, 'pending check cannot contain approval evidence');
      if (check.status === 'passed') {
        for (const field of REQUIRED_REVIEWED_DATA[check.id] ?? []) {
          if (!hasReviewedValue(dossier.reviewedData?.[field])) issue(errors, `${base}.reviewedData.${field}`, `passed ${check.id} check requires an explicit reviewed value`);
        }
      }
      if (check.status !== 'passed') priorCheckPassed = false;
    }
    if (dossier.status === 'approved') {
      for (const [checkIndex, check] of (dossier.checks ?? []).entries()) {
        if (check.order !== checkIndex + 1 || check.status !== 'passed' || !check.reviewedAt || !(check.evidence ?? []).length) {
          issue(errors, `${base}.checks[${checkIndex}]`, 'approved dossier requires a passed, evidenced check in sequence');
        }
      }
      if (!dossier.finalDecision?.approvedAt || !dossier.finalDecision?.approvedBy || !(dossier.finalDecision?.evidence ?? []).length) {
        issue(errors, `${base}.finalDecision`, 'approved dossier requires final approval evidence');
      }
    }
  }

  for (const [index, service] of (registry.services ?? []).entries()) {
    const base = `registry.services[${index}]`;
    if (service.sourceLegacyIds?.length !== 1) issue(errors, `${base}.sourceLegacyIds`, 'progressive review permits exactly one inventoried service per Service Entity');
    const legacyId = service.sourceLegacyIds?.[0];
    const dossier = dossierByLegacyId.get(legacyId);
    if (!dossier || dossier.status !== 'approved') issue(errors, base, 'Service Entity is forbidden before individual dossier approval');
    if (dossier && dossier.targetServiceId !== service.id) issue(errors, `${base}.id`, 'must match the approved dossier target');
    if (dossier && dossier.authorityId !== service.authorityId) issue(errors, `${base}.authorityId`, 'must match the approved dossier authority');
    if (!acceptedServiceIds.has(service.id)) issue(errors, base, 'Service Entity has not passed all business acceptance criteria');
  }

  for (const legacyId of activeServiceOrder.slice(0, Math.max(activeServiceIndex, 0))) {
    const dossier = dossierByLegacyId.get(legacyId);
    if (!dossier || dossier.status !== 'approved') {
      issue(errors, 'activeServiceLegacyId', 'cannot advance to the next service before the previous service dossier is approved');
    }
  }

  for (const [queueIndex, entry] of queue.entries()) {
    if (entry.status !== 'complete') continue;
    const expected = authorityCandidates(inventory, entry.authorityId);
    for (const candidate of expected) {
      const dossier = dossierByLegacyId.get(candidate.legacyId);
      if (!dossier || dossier.status !== 'approved' || !serviceById.has(dossier.targetServiceId)) {
        issue(errors, `authorityQueue[${queueIndex}]`, 'completed authority still has an unapproved or unregistered service');
      }
    }
  }

  const activeApproved = activeCandidates.filter((candidate) => dossierByLegacyId.get(candidate.legacyId)?.status === 'approved').length;
  const activeRegistered = activeCandidates.filter((candidate) => {
    const dossier = dossierByLegacyId.get(candidate.legacyId);
    return dossier?.status === 'approved' && serviceById.has(dossier.targetServiceId);
  }).length;

  return {
    valid: errors.length === 0,
    mode: state.mode,
    activeAuthorityId: state.activeAuthorityId,
    activeServiceLegacyId: state.activeServiceLegacyId,
    activeAuthorityExpectedServices: activeCandidates.length,
    activeAuthorityApprovedServices: activeApproved,
    activeAuthorityRegisteredServices: activeRegistered,
    totalDossiers: dossiers.length,
    registryServices: registry.services?.length ?? 0,
    lockedAuthorities: queue.filter((entry) => entry.status === 'locked').length,
    errors
  };
}
