export const REQUIRED_REVIEW_CHECKS = Object.freeze([
  'service-data',
  'government-authority',
  'emirate',
  'main-subcategory',
  'license-or-activity',
  'keywords',
  'content',
  'faq',
  'documents',
  'fees',
  'completion-time',
  'related-services',
  'government-link',
  'government-link-live-test',
  'search',
  'all-category-access',
  'homepage-access',
  'related-service-access',
  'user-experience',
  'final-approval'
]);

function issue(errors, path, message) {
  errors.push({ path, message });
}

function authorityCandidates(inventory, authorityId) {
  return inventory.candidates.filter((candidate) => candidate.businessDimensions.authorityGroup.startsWith(`${authorityId} `));
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
      if (dossierServiceIndex > activeServiceIndex) issue(errors, `${base}.legacyId`, 'later services are locked until the active service is approved and registered');
      if (dossierServiceIndex < activeServiceIndex && dossier.status !== 'approved') issue(errors, `${base}.status`, 'earlier service must already be approved');
    }

    const checkIds = (dossier.checks ?? []).map((check) => check.id);
    if (checkIds.join('|') !== REQUIRED_REVIEW_CHECKS.join('|')) issue(errors, `${base}.checks`, 'all 20 checks must exist in the required order');
    let priorCheckPassed = true;
    for (const [checkIndex, check] of (dossier.checks ?? []).entries()) {
      if (check.status === 'passed' && !priorCheckPassed) issue(errors, `${base}.checks[${checkIndex}]`, 'review checks must pass strictly in order');
      if (check.status === 'passed' && (!check.reviewedAt || !(check.evidence ?? []).length)) issue(errors, `${base}.checks[${checkIndex}]`, 'passed check requires review time and evidence');
      if (check.status === 'pending' && (check.reviewedAt || (check.evidence ?? []).length)) issue(errors, `${base}.checks[${checkIndex}]`, 'pending check cannot contain approval evidence');
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
    if (!dossier || dossier.status !== 'approved' || !serviceById.has(dossier.targetServiceId) || !acceptedServiceIds.has(dossier.targetServiceId)) {
      issue(errors, 'activeServiceLegacyId', 'cannot advance to the next service before the previous service is approved, registered, and business-accepted');
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
