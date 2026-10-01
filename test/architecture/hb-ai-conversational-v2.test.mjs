import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../../public-ai-concierge.js", import.meta.url), "utf8");
const css = await readFile(new URL("../../global-os.css", import.meta.url), "utf8");
const stabilizer = await readFile(new URL("../../src/publication/stabilize-homepage-runtime.mjs", import.meta.url), "utf8");

test("HB AI attachment analysis is guarded against duplicate re-entry", () => {
  assert.match(source, /attachmentAnalysisInFlight/);
  assert.match(source, /if \(!file \|\| attachmentAnalysisInFlight\) return/);
  assert.match(source, /analyzeButton\.disabled = true/);
  assert.match(source, /finally \{[\s\S]*attachmentAnalysisInFlight = false/);
});

test("HB AI conversation submit is guarded against duplicate analysis", () => {
  assert.match(source, /analysisInFlight/);
  assert.match(source, /displayed\.length < 2 \|\| analysisInFlight/);
  assert.match(source, /finally \{[\s\S]*analysisInFlight = false/);
});

test("HB AI V2 exposes progressive disclosures and contextual follow-up", () => {
  assert.match(source, /hb-chat-disclosure/);
  assert.match(source, /data-context-prompt|dataset\.contextPrompt/);
  assert.match(source, /كم الرسوم الحكومية الموثقة لهذه المعاملة/);
  assert.match(source, /hb-chat-source--disclosure/);
});

test("HB AI V2 keeps modern composer behavior and generated-site persistence", () => {
  assert.match(source, /event\.key === "Enter" && !event\.shiftKey/);
  assert.match(source, /Math\.min\(composer\.scrollHeight, 144\)/);
  assert.match(css, /\.hb-chat-send\{width:44px!important/);
  assert.match(stabilizer, /hb-ai-quality-20261001b/);
  assert.match(stabilizer, /2026-10-01\.hb-ai-conversational-v2/);
});

test("HB AI public consultation retains secure auth handoff state", () => {
  assert.match(source, /service_slug:/);
  assert.match(source, /jurisdiction_code:/);
  assert.match(source, /authority_key:/);
  assert.match(source, /conversation_context:/);
  assert.match(source, /\/auth\/\?return=/);
});
