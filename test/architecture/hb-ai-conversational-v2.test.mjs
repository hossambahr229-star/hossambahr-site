import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../../public-ai-concierge.js", import.meta.url), "utf8");
const edge = await readFile(new URL("../../supabase/functions/public-ai-concierge/index.ts", import.meta.url), "utf8");
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


test("relationship detection uses phrase boundaries so الإمارات never becomes الأم", () => {
  assert.match(edge, /function hasPhrase/);
  assert.match(edge, /if \(hasPhrase\(text, words\)\) return relationship/);
});


test("direct emirate licence requests are treated as issuance intent",()=>{
  assert.match(edge,/directLicenseRequest/);
  assert.match(edge,/company && \(open \|\| directLicenseRequest\)/);
  assert.match(edge,/jurisdictionCode === emirate/);
});


test("provider retries honor Retry-After and are bounded",()=>{
  assert.match(edge,/function providerRetryDelayMs/);
  assert.match(edge,/headers\.get\("retry-after"\)/);
  assert.match(edge,/ms<=5000 \? ms : null/);
});


test("billing and quota 429s fail fast instead of retrying",()=>{
  assert.match(edge,/credit_balance_exhausted/);
  assert.match(edge,/organization_spend_limit_exceeded/);
  assert.match(edge,/project_spend_limit_exceeded/);
  assert.match(edge,/organization_usage_limit_exceeded/);
  assert.match(edge,/retryableProviderHttpError/);
});


test("stream fallback preserves semantic metadata from the initial meta event",()=>{
  assert.match(source,/goal_context:payload\?\.goal_context\|\|\{safe_goal:query\}/);
  assert.match(source,/rate_limit:payload\?\.rate_limit/);
});


test("document AI fails closed and enforces authenticated bounded document inputs", async()=>{
  const fs=await import("node:fs/promises");
  const doc=await fs.readFile("supabase/functions/document-ai/index.ts","utf8");
  assert.match(doc,/authentication_required/);
  assert.match(doc,/origin_not_allowed/);
  assert.match(doc,/MAX_BYTES=3\*1024\*1024/);
  assert.match(doc,/unsupported_file_type/);
  assert.match(doc,/Analyze only what is actually visible\/present/);
  assert.match(doc,/Do not infer missing passport\/ID\/license fields/);
  assert.match(doc,/store:false/);
  assert.match(doc,/provider_store:false/);
  assert.doesNotMatch(doc,/serviceKey[^\n]*reply|OPENAI_API_KEY[^\n]*reply/);
});
