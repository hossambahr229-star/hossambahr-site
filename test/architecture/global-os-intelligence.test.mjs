import test from "node:test";
import assert from "node:assert/strict";
import {evaluateCompliance,complianceHealth} from "../../src/global/compliance/compliance-engine.mjs";
import {evaluateScenarioOption,compareScenarioOptions} from "../../src/global/simulation/scenario-engine.mjs";
import {executiveSnapshot,attentionItems} from "../../src/global/intelligence/executive-intelligence.mjs";

test("compliance engine reports missing facts and health",()=>{
  const findings=evaluateCompliance({controls:[{controlKey:"license",severity:"critical",requiredFacts:["licenseExpiry"],active:true}],facts:{}});
  assert.equal(findings[0].status,"open");
  assert.equal(complianceHealth(findings).score,85);
});

test("scenario engine explains constraints without selecting a winner",()=>{
  const a=evaluateScenarioOption({option:{key:"dubai",jurisdictionCode:"AE-DU"},rules:[{field:"activity",required:true}],costItems:[{amount:1000}]});
  const b=evaluateScenarioOption({option:{key:"ad",jurisdictionCode:"AE-AZ",activity:"consulting"},rules:[{field:"activity",required:true}],costItems:[{amount:900}]});
  const compared=compareScenarioOptions([a,b]);
  assert.equal(compared.length,2);
  assert.equal(compared[0].constraintCount,1);
  assert.equal(compared[1].eligibleForReview,true);
});

test("executive intelligence highlights blockers and critical findings",()=>{
  const snap=executiveSnapshot({
    cases:[{status:"blocked"},{status:"in_progress"}],
    quotes:[{status:"sent",total:3000}],
    payments:[{status:"succeeded",amount:1550}],
    findings:[{status:"open",severity:"critical"}]
  });
  assert.equal(snap.openCases,2);
  assert.equal(snap.revenue,1550);
  assert.equal(attentionItems(snap)[0].key,"critical_compliance");
});
