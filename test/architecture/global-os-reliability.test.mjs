import test from "node:test";
import assert from "node:assert/strict";
import { makeIdempotencyKey, nextRetryDelayMs, shouldDeadLetter } from "../../src/global/reliability/execution-guard.mjs";

test("idempotency keys require stable operation identity", () => {
  assert.equal(makeIdempotencyKey({actorId:"u1",operation:"case.submit",entityId:"c1"}),"u1:case.submit:c1:");
  assert.throws(() => makeIdempotencyKey({operation:"x",entityId:"c1"}));
});

test("retry delay is exponential and capped", () => {
  assert.equal(nextRetryDelayMs(0),1000);
  assert.equal(nextRetryDelayMs(2),4000);
  assert.equal(nextRetryDelayMs(99),15*60*1000);
  assert.equal(shouldDeadLetter(8),true);
});
