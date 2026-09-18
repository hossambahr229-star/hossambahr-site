import test from "node:test";
import assert from "node:assert/strict";
import {
  ActorType,
  CaseStatus,
  TaskStatus,
  buildAuditEnvelope,
  isTerminalCaseStatus,
  normalizeJurisdictionCode,
  requiresHumanApproval
} from "../../src/global/core/domain-model.mjs";

test("terminal case states are explicit", () => {
  assert.equal(isTerminalCaseStatus(CaseStatus.COMPLETED), true);
  assert.equal(isTerminalCaseStatus(CaseStatus.CANCELLED), true);
  assert.equal(isTerminalCaseStatus(CaseStatus.IN_PROGRESS), false);
});

test("regulated or irreversible actions require approval", () => {
  assert.equal(requiresHumanApproval({ externalSubmission: true }), true);
  assert.equal(requiresHumanApproval({ financial: true }), true);
  assert.equal(requiresHumanApproval({ irreversible: true }), true);
  assert.equal(requiresHumanApproval({}), false);
});

test("jurisdiction codes are normalized", () => {
  assert.equal(normalizeJurisdictionCode(" ae:du "), "AE:DU");
});

test("audit envelopes reject unknown actor types", () => {
  assert.throws(() => buildAuditEnvelope({
    actorType: "unknown",
    action: "read",
    entityType: "case",
    entityId: "1"
  }));
  const event = buildAuditEnvelope({
    actorType: ActorType.USER,
    action: "case.create",
    entityType: "case",
    entityId: "1"
  });
  assert.equal(event.actorType, ActorType.USER);
  assert.equal(typeof event.occurredAt, "string");
});

test("task states retain explicit approval state", () => {
  assert.equal(TaskStatus.NEEDS_APPROVAL, "needs_approval");
});
