import test from "node:test";
import assert from "node:assert/strict";
import {evaluateHealth,calculateSlo,HealthState,traceEnvelope} from "../../src/global/observability/health.mjs";

test("health becomes unhealthy if any hard check fails",()=>{
  const result=evaluateHealth([{key:"db",status:"ok"},{key:"queue",status:"failed"}]);
  assert.equal(result.state,HealthState.UNHEALTHY);
});

test("SLO calculation exposes target and error budget",()=>{
  const result=calculateSlo({total:100000,successful:99950,target:.999});
  assert.equal(result.met,true);
  assert.ok(result.errorBudgetRemaining>=0);
});

test("trace envelopes are explicit and immutable-friendly",()=>{
  const trace=traceEnvelope({traceId:"t",spanId:"s",operation:"case.create"});
  assert.equal(trace.operation,"case.create");
});
