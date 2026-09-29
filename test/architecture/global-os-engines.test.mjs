import test from "node:test";
import assert from "node:assert/strict";
import { evaluateRules, summarizeRuleDecision } from "../../src/global/policy/policy-engine.mjs";
import { compileWorkflow, nextExecutableTasks } from "../../src/global/workflow/workflow-engine.mjs";
import { assertAgentScope } from "../../src/global/ai/agent-contracts.mjs";
import { selectModel } from "../../src/global/ai/model-router.mjs";

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


test("AI model router accepts production snake_case catalog fields", () => {
  const model = selectModel({
    route: {
      active:true,
      preferred_models:[{provider:"openai",modelKey:"gpt-5.6-luna"}],
      required_capabilities:["text","structured_output"],
      max_data_class:"internal",
      require_region:null
    },
    models:[{
      provider:"openai",
      model_key:"gpt-5.6-luna",
      capability_tags:["text","structured_output","multilingual"],
      allowed_data_classes:["public","internal"],
      regions:[],
      status:"active"
    }]
  });
  assert.equal(model.model_key,"gpt-5.6-luna");
});

test("AI model router rejects a model that cannot handle the requested data class", () => {
  assert.throws(() => selectModel({
    route:{
      active:true,
      preferred_models:[{provider:"openai",modelKey:"gpt-5.6-luna"}],
      required_capabilities:["text"],
      max_data_class:"confidential"
    },
    models:[{
      provider:"openai",
      model_key:"gpt-5.6-luna",
      capability_tags:["text"],
      allowed_data_classes:["public","internal"],
      regions:[],
      status:"active"
    }]
  }), /no compliant AI model available/);
});
