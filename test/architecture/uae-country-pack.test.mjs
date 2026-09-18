import test from "node:test";
import assert from "node:assert/strict";
import { resolveUaeJurisdiction, buildUaeCaseContext } from "../../src/global/country-packs/uae-resolver.mjs";

test("UAE resolver supports Arabic and English emirate names", () => {
  assert.equal(resolveUaeJurisdiction({emirate:"دبي"}).code, "AE-DU");
  assert.equal(resolveUaeJurisdiction({emirate:"Abu Dhabi"}).code, "AE-AZ");
});

test("UAE case context falls back to country level", () => {
  assert.equal(buildUaeCaseContext({goal:"test"}).jurisdictionCode, "AE");
});
