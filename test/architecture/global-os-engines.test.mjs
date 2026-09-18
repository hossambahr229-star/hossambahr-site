import test from "node:test";
import assert from "node:assert/strict";
import { evaluateRules, summarizeRuleDecision } from "../../src/global/policy/policy-engine.mjs";
import { compileWorkflow, nextExecutableTasks } from "../../src/global/workflow/workflow-engine.mjs";
import { assertAgentScope } from "../../src/global/ai/agent-contracts.mjs";

test("policy engine prefers deny over review and allow", () => {
  const results = evaluateRules({
    facts: { age: 17, country: "AE" },
    rules: [
      { id:"r1", when:[{field:"country",op:"eq",value:"AE"}], effect:"allow" },
      { id:"r2", when:[{field:"age",op:"lte",value:17}], effect:"review" },
      { id:"r3", when:[{field:"age",op:"lte",value:15}], effect:"deny" }
    ]
  });
  assert.equal(summarizeRuleDecision(results).decision, "review");
});

test("workflow compiles and exposes only dependency-free tasks first", () => {
  const compiled = compileWorkflow({
    id:"sample",
    steps:[
      { key:"collect", title:"Collect" },
      { key:"review", title:"Review", dependsOn:["collect"], risk:{ externalSubmission:true } }
    ]
  });
  assert.equal(compiled.tasks[1].requiresApproval, true);
  assert.deepEqual(nextExecutableTasks(compiled.tasks).map(x=>x.key), ["collect"]);
});

test("agents cannot exceed contract scopes", () => {
  assert.equal(assertAgentScope("planner","task:draft"), true);
  assert.throws(() => assertAgentScope("planner","government:submit"));
});
