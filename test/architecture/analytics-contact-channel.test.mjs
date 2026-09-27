import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");

test("analytics records only coarse contact-channel labels", async () => {
  const client = await readFile(resolve(root, "analytics-client.js"), "utf8");
  const edge = await readFile(resolve(root, "supabase/functions/web-analytics/index.ts"), "utf8");
  const owner = await readFile(resolve(root, "owner-client.js"), "utf8");

  assert.match(client, /channel:\s*"whatsapp"/);
  assert.match(client, /channel:\s*"phone"/);
  assert.match(client, /channel:\s*"email"/);
  assert.match(client, /target_channel:\s*targetChannel/);
  assert.doesNotMatch(client, /target_url|phone_number|message_text/);

  assert.match(edge, /body\.target_channel === "whatsapp"/);
  assert.match(edge, /target_channel:/);
  assert.match(owner, /hb_web_analytics_channels/);
  assert.match(owner, /data-owner-whatsapp-7d/);
});
