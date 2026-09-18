import test from "node:test";
import assert from "node:assert/strict";
import { graphEdge, RelationType, activeAt } from "../../src/global/graph/business-graph.mjs";
import { buildApprovalRequest, canExecuteApproval } from "../../src/global/approval/approval-engine.mjs";
import { calculateQuote, assertPaymentReady } from "../../src/global/finance/finance-engine.mjs";

test("business graph enforces typed relations and temporal validity", () => {
  assert.equal(graphEdge({from:"a",to:"b",relation:RelationType.OWNS}).relationType, "owns");
  assert.throws(()=>graphEdge({from:"a",to:"a",relation:RelationType.OWNS}));
  assert.equal(activeAt({validFrom:"2026-01-01T00:00:00Z",validUntil:"2027-01-01T00:00:00Z"},new Date("2026-06-01T00:00:00Z")),true);
});

test("approval engine only creates gates for risky actions", () => {
  assert.equal(buildApprovalRequest({userId:"u",actionKey:"read",payloadHash:"h",requestedByType:"agent",risk:{}}),null);
  const approval=buildApprovalRequest({userId:"u",actionKey:"submit",payloadHash:"h",requestedByType:"agent",risk:{externalSubmission:true}});
  assert.equal(approval.status,"pending");
  assert.equal(canExecuteApproval({...approval,status:"approved"}),true);
});

test("finance engine separates government and service fees", () => {
  const totals=calculateQuote([
    {type:"government_fee",unitAmount:950},
    {type:"service_fee",unitAmount:600}
  ]);
  assert.equal(totals.governmentFees,950);
  assert.equal(totals.serviceFees,600);
  assert.equal(totals.total,1550);
  assert.equal(assertPaymentReady({amount:1550,currency:"AED"}),true);
});
