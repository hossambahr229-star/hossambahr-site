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
import { assertServiceCountryCompatibility, countryPackKey, evaluateCountryPackReadiness, validateCountryPack } from "../../src/global/country/country-pack.mjs";

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


test("country pack contract enforces ISO-scoped pack keys", () => {
  const pack=validateCountryPack({
    pack_key:"country:AE",
    country_code:"ae",
    version:1,
    status:"active",
    default_locale:"ar-AE",
    default_currency:"aed",
    supported_languages:["ar","en"]
  });
  assert.equal(pack.packKey,countryPackKey("AE"));
  assert.equal(pack.defaultCurrency,"AED");
});

test("country pack readiness blocks missing policies or workflows", () => {
  const result=evaluateCountryPackReadiness({
    metrics:{
      authorities_active:2,
      services_active:10,
      services_without_authority:0,
      services_without_policy:1,
      services_without_workflow:0,
      services_without_active_policy:1,
      services_without_active_workflow:0
    }
  });
  assert.equal(result.ready,false);
  assert.ok(result.reasons.includes("missingPolicies"));
  assert.ok(result.reasons.includes("inactivePolicies"));
});

test("service and requested country packs cannot conflict", () => {
  assert.equal(assertServiceCountryCompatibility({
    servicePackKey:"country:AE",
    requestedPackKey:"country:AE"
  }),true);
  assert.throws(()=>assertServiceCountryCompatibility({
    servicePackKey:"country:AE",
    requestedPackKey:"country:SA"
  }),/conflicts/);
});
