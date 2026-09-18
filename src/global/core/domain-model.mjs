export const HB_GLOBAL_OS_VERSION = "0.1.0";

export const CaseStatus = Object.freeze({
  DRAFT: "draft",
  QUALIFYING: "qualifying",
  WAITING_CUSTOMER: "waiting_customer",
  READY_FOR_REVIEW: "ready_for_review",
  APPROVED: "approved",
  IN_PROGRESS: "in_progress",
  WAITING_EXTERNAL: "waiting_external",
  BLOCKED: "blocked",
  COMPLETED: "completed",
  CANCELLED: "cancelled"
});

export const TaskStatus = Object.freeze({
  TODO: "todo",
  IN_PROGRESS: "in_progress",
  WAITING: "waiting",
  NEEDS_APPROVAL: "needs_approval",
  DONE: "done",
  CANCELLED: "cancelled"
});

export const ActorType = Object.freeze({
  USER: "user",
  STAFF: "staff",
  PARTNER: "partner",
  AGENT: "agent",
  SYSTEM: "system",
  INTEGRATION: "integration"
});

export const EvidenceType = Object.freeze({
  DOCUMENT: "document",
  SOURCE: "source",
  APPROVAL: "approval",
  PAYMENT: "payment",
  EXTERNAL_RESPONSE: "external_response",
  AGENT_RUN: "agent_run"
});

export const Confidence = Object.freeze({
  UNVERIFIED: "unverified",
  SOURCE_BACKED: "source_backed",
  RULE_VALIDATED: "rule_validated",
  HUMAN_REVIEWED: "human_reviewed"
});

export function isTerminalCaseStatus(status) {
  return status === CaseStatus.COMPLETED || status === CaseStatus.CANCELLED;
}

export function requiresHumanApproval(action = {}) {
  return Boolean(
    action.irreversible ||
    action.financial ||
    action.externalSubmission ||
    action.highRisk ||
    action.requiresSignature
  );
}

export function buildAuditEnvelope({
  actorType,
  actorId = null,
  action,
  entityType,
  entityId,
  metadata = {}
}) {
  if (!Object.values(ActorType).includes(actorType)) throw new Error("invalid actorType");
  if (!action || !entityType || !entityId) throw new Error("audit envelope requires action, entityType and entityId");
  return {
    actorType,
    actorId,
    action,
    entityType,
    entityId,
    metadata,
    occurredAt: new Date().toISOString()
  };
}

export function normalizeJurisdictionCode(value) {
  return String(value || "").trim().toUpperCase().replace(/[^A-Z0-9:-]/g, "");
}
