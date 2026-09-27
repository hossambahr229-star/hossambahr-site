import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");

test("privacy disclosure describes contact-channel analytics without PII destinations", async () => {
  const source = await readFile(resolve(root, "src/publication/enforce-production-metadata.mjs"), "utf8");
  assert.match(source, /data-hb-analytics-disclosure="v3"/);
  assert.match(source, /WhatsApp أو الهاتف أو البريد/);
  assert.match(source, /لا رقم الهاتف، ولا عنوان البريد، ولا رابط WhatsApp، ولا نص الرسالة/);
});
