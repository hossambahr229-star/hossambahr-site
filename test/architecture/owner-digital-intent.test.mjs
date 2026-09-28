import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("owner dashboard exposes Digital Intent without relabeling it as Leads", async () => {
  const html = await readFile(new URL("../../owner/index.html", import.meta.url), "utf8");
  assert.match(html, /Digital Intent/);
  assert.match(html, /data-owner-digital-sessions/);
  assert.match(html, /data-owner-digital-commercial-rate/);
  assert.match(html, /لا تُحتسب هذه الأرقام ضمن Leads أو المبيعات/);
});

test("owner client loads owner-only Digital Intent RPC", async () => {
  const js = await readFile(new URL("../../owner-client.js", import.meta.url), "utf8");
  assert.match(js, /hb_owner_digital_intent_snapshot/);
  assert.match(js, /loadDigitalIntent/);
  assert.match(js, /data-owner-digital-sources/);
  assert.match(js, /data-owner-digital-paths/);
});
