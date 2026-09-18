import test from "node:test";
import assert from "node:assert/strict";
import {buildExecutionPlan,executablePlanSteps,assertNoAutonomousSensitiveExecution} from "../../src/global/ai/orchestrator.mjs";
import {selectAssignee,slaState} from "../../src/global/operations/assignment-engine.mjs";

test("orchestrator blocks sensitive steps behind approval",()=>{
  const plan=buildExecutionPlan({caseId:"c1",steps:[
    {key:"read",agent:"intake",scope:"case:read",action:"read"},
    {key:"submit",agent:"planner",scope:"task:draft",action:"prepare submission",dependsOn:["read"],risk:{externalSubmission:true}}
  ]});
  assert.equal(plan.requiresHumanApproval,true);
  assert.deepEqual(executablePlanSteps(plan,[],[]).map(x=>x.key),["read"]);
  assert.deepEqual(executablePlanSteps(plan,["read"],[]).map(x=>x.key),[]);
  assert.deepEqual(executablePlanSteps(plan,["read"],["submit"]).map(x=>x.key),["submit"]);
  assert.throws(()=>assertNoAutonomousSensitiveExecution(plan.steps[1]));
});

test("assignment engine prefers jurisdiction and service expertise",()=>{
  const selected=selectAssignee({caseContext:{jurisdictionCode:"AE-DU",serviceTag:"residency",priority:"normal"},candidates:[
    {id:"a",active:true,jurisdictions:["AE-DU"],serviceTags:["residency"],openWork:8},
    {id:"b",active:true,jurisdictions:["AE-AZ"],serviceTags:["residency"],openWork:0}
  ]});
  assert.equal(selected.assignee.id,"a");
});

test("SLA engine surfaces breach and escalation",()=>{
  const state=slaState({createdAt:"2026-09-18T00:00:00Z",now:new Date("2026-09-18T03:00:00Z"),policy:{targetCompletionMinutes:120,escalationAfterMinutes:150}});
  assert.equal(state.breached,true);
  assert.equal(state.escalate,true);
});
