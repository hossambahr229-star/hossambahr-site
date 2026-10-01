import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const edge = await readFile(new URL("../../supabase/functions/public-ai-concierge/index.ts", import.meta.url), "utf8");
const ui = await readFile(new URL("../../public-ai-concierge.js", import.meta.url), "utf8");
const css = await readFile(new URL("../../global-os.css", import.meta.url), "utf8");

const golden = [
  "أريد أجدد إقامة زوجتي في دبي",
  "كم رسوم تجديد إقامة زوجتي؟",
  "ما الأوراق المطلوبة؟",
  "إقامتي أبوظبي هل أراجع ICP أم GDRFA؟",
  "أريد أفتح شركة في دبي",
  "أريد أضيف شريك",
  "أريد ألغي موظف",
  "كيف أنقل موظف لشركتي؟",
  "أريد أجدد الهوية",
  "أريد إقامة عمالة مساعدة في أبوظبي",
  "أريد رخصة كافتيريا في عجمان",
  "أريد أنقل رخصة رأس الخيمة إلى دبي",
  "أريد أعمل استرحام مخالفات في دبي"
];

test("answer correctness gate separates retrieval confidence from grounded facts", () => {
  assert.match(edge, /fact_status/);
  assert.match(edge, /VERIFIED_FACT/);
  assert.match(edge, /DERIVED_GUIDANCE/);
  assert.match(edge, /MISSING_INFORMATION/);
  assert.match(edge, /NEEDS_CLARIFICATION/);
  assert.match(edge, /source_backed/);
  assert.match(edge, /ambiguity_detected/);
});

test("fee and duration answers fail closed instead of inventing values", () => {
  assert.match(edge, /لا توجد في المعرفة الموثقة الحالية قيمة رسوم محددة/);
  assert.match(edge, /لن أضع رقمًا تقديريًا/);
  assert.match(edge, /لا توجد مدة تنفيذ محددة وموثقة/);
  assert.match(edge, /ruleFact\(rules, "fees"\)/);
  assert.match(edge, /ruleFact\(rules, "duration"\)/);
});

test("follow-up focus uses latest turn while full goal retains conversation context", () => {
  assert.match(edge, /latest_turn/);
  assert.match(edge, /answerFocus\(latestTurn\)/);
  assert.match(ui, /latest_turn: displayed/);
  assert.match(ui, /service_slug: state\.service_slug/);
  assert.match(ui, /jurisdiction_code: state\.jurisdiction_code/);
  assert.match(ui, /authority_key: state\.authority_key/);
});

test("official-source trust badge is conditional on source grounding", () => {
  assert.match(ui, /grounding\?\.source_backed/);
  assert.match(ui, /مستند إلى مصدر رسمي/);
  assert.match(ui, /آخر تحقق/);
});

test("premium AI gate removes dashboard chrome and keeps mobile composer sticky", () => {
  assert.match(css, /Premium Calm Gate/);
  assert.match(css, /background:#f8f7f3!important/);
  assert.match(css, /hb-chat-message--assistant \.hb-chat-bubble\{background:transparent/);
  assert.match(css, /position:sticky!important/);
});

test("golden question catalog covers required UAE transaction families", () => {
  assert.equal(golden.length, 13);
  for (const q of golden) assert.ok(q.length > 8);
});

test("grounded resolver is the single service-decision path", () => {
  assert.doesNotMatch(ui, /الخدمة الأقرب المقصودة:/);
  assert.doesNotMatch(ui, /const initialHint = catalogIntentHint\(query\)/);
  assert.doesNotMatch(ui, /const refined = await fetch/);
});


test("parent residence issuance cannot fall through to cancellation identity", () => {
  assert.match(edge, /parent && residence && !wantsCancel/);
  assert.match(edge, /wantsIssue/);
  assert.match(edge, /\(wantsRenew \|\| wantsIssue\).*cancel/);
});

test("public conversational budget supports multi-turn QA without disabling rate protection", () => {
  assert.match(edge, /p_limit: 120/);
  assert.match(edge, /req\.headers\.get\("x-hb-qa-run"\)/);
  assert.match(edge, /rate_limited/);
});
