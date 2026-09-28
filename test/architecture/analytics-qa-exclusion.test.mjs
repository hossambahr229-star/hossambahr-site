import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("analytics ignores explicitly marked QA traffic", async () => {
  const analytics = await readFile(new URL("../../analytics-client.js", import.meta.url), "utf8");
  assert.match(analytics, /query\.get\("hb_qa"\) === "1"/);
});

test("browser QA entrypoints mark production traffic with hb_qa=1", async () => {
  const files = [
    "../../visual-layout-audit.mjs",
    "../../final-platform-acceptance.mjs",
    "../../src/publication/verify-phase9-1-visual-quality.mjs",
    "../../src/publication/verify-homepage-runtime-stability.mjs",
  ];
  for (const relative of files) {
    const source = await readFile(new URL(relative, import.meta.url), "utf8");
    assert.match(source, /hb_qa=1/, relative + " must mark browser QA traffic");
  }
});
