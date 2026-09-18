import test from "node:test";
import assert from "node:assert/strict";
import {buildStandingAuthorization,standingAuthorizationAllows,isAlwaysSensitiveScope} from "../../src/global/authorization/standing-authority.mjs";
import {automationDecision,automationIdempotencyKey,nextAutomationState} from "../../src/global/automation/automation-engine.mjs";

test("standing authorization can cover routine internal work",()=>{
  const auth=buildStandingAuthorization({
    userId:"u1",
    purpose:"Run routine case preparation without repeated prompts",
    allowedScopes:["case:read","task:draft","document:extract"],
    allowedActionClasses:["case_enrichment","document_classification"],
    maxRiskLevel:"medium"
  });
  assert.equal(standingAuthorizationAllows({authorization:auth,scope:"task:draft",riskLevel:"low",actionClass:"case_enrichment"}),true);
});

test("standing authorization can never authorize sensitive scopes",()=>{
  const auth=buildStandingAuthorization({
    userId:"u1",
    purpose:"Routine operations",
    allowedScopes:["government:submit","payment:capture","case:read"]
  });
  assert.equal(isAlwaysSensitiveScope("government:submit"),true);
  assert.equal(auth.allowedScopes.includes("government:submit"),false);
  assert.equal(standingAuthorizationAllows({authorization:auth,scope:"government:submit"}),false);
});

test("automation engine queues authorized low risk work and gates high risk",()=>{
  const auth=buildStandingAuthorization({
    userId:"u1",
    purpose:"Routine operations",
    allowedScopes:["task:draft"],
    allowedActionClasses:["case_enrichment"],
    maxRiskLevel:"medium"
  });
  const low=automationDecision({policy:{enabled:true,requiredScope:"task:draft",riskClass:"low",requiresStandingAuthorization:true,actionType:"case_enrichment"},authorization:auth});
  assert.equal(low.allowed,true);
  const high=automationDecision({policy:{enabled:true,requiredScope:"government:submit",riskClass:"high",requiresStandingAuthorization:true,actionType:"external_submission"},authorization:auth});
  assert.equal(high.status,"needs_approval");
});

test("automation lifecycle and idempotency are deterministic",()=>{
  assert.equal(automationIdempotencyKey({policyKey:"renewal-watch",entityId:"lic1",eventId:"evt1"}),"renewal-watch:lic1:evt1:");
  assert.equal(nextAutomationState("queued","start"),"running");
  assert.equal(nextAutomationState("running","complete"),"completed");
  assert.throws(()=>nextAutomationState("completed","retry"));
});
