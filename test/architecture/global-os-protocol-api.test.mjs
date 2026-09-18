import test from "node:test";
import assert from "node:assert/strict";
import {protocolEnvelope,transition,ProtocolState,canTransition} from "../../src/global/protocol/transaction-protocol.mjs";
import {hashApiSecret,keyPrefix,scopeAllowed,assertWebhookUrl} from "../../src/global/developer/api-security.mjs";

test("protocol follows controlled lifecycle",()=>{
  let tx=protocolEnvelope({intent:"company.create",idempotencyKey:"k1"});
  assert.equal(tx.state,ProtocolState.REQUESTED);
  assert.equal(canTransition("requested","verified"),true);
  tx=transition(tx,"verified");
  tx=transition(tx,"priced");
  tx=transition(tx,"awaiting_approval");
  tx=transition(tx,"approved");
  tx=transition(tx,"executing");
  tx=transition(tx,"evidenced",{evidenceRef:"e1"});
  tx=transition(tx,"settled",{settlementRef:"s1"});
  assert.equal(tx.state,"settled");
  assert.deepEqual(tx.evidenceRefs,["e1"]);
  assert.throws(()=>transition(tx,"executing"));
});

test("developer security never stores raw API secrets",()=>{
  const secret="hb_live_abcdefghijklmnopqrstuvwxyz123456";
  assert.equal(hashApiSecret(secret).length,64);
  assert.equal(keyPrefix(secret),"hb_live_ab");
  assert.equal(scopeAllowed(["case:read"],"case:read"),true);
  assert.match(assertWebhookUrl("https://example.com/hooks"),/^https:/);
  assert.throws(()=>assertWebhookUrl("http://example.com/hooks"));
});
