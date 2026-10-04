import assert from "node:assert/strict";import {createRequire} from "node:module";import {resolve} from "node:path";import {mkdir,writeFile} from "node:fs/promises";
const require=createRequire(resolve(process.env.HB_NODE_MODULES||".","_hb-continuity-browser.js"));const {chromium}=require("playwright");
const base=process.env.HB_BASE_URL||"https://hossambahr.com";const out=resolve(process.env.HB_OUTPUT_DIR||"final-platform-acceptance");await mkdir(out,{recursive:true});
const scenarios=[
["عايز تأشيرة سياحية 5 سنين","الأوراق المطلوبة","والرسوم؟","الشروط؟","الخطوات؟","الرابط؟"],
["عايز إقامة لمراتي في دبي","والأولاد؟","الرسوم؟"],["أريد أجدد رخصتي في دبي","الأوراق؟"],["أبغي أعدل الرخصة في الشارقة","الخطوات؟"],["عايز ألغي رخصة دبي","الشروط؟"],
["عايز تصريح عمل لموظف","الأوراق؟"],["عايز أنقل موظف لشركتي","الخطوات؟"],["إقامة العاملة المنزلية في أبوظبي","الأوراق؟"],["تجديد الهوية الإماراتية","الرسوم؟"],["إلغاء إقامة عبر ICP","الخطوات؟"],
["أفتح شركة في عجمان","الأوراق؟"],["رخصة جديدة رأس الخيمة","الشروط؟"],["تجديد رخصة الفجيرة","المدة؟"],["إصدار رخصة أم القيوين","الجهة؟"],["إقامة ذهبية لمستثمر","الشروط؟"],
["أكفل والدتي في دبي","الأوراق؟"],["wife residence Dubai","documents?"],["need work permit UAE","fees?"],["Ejari renewal Dubai","الأوراق؟"],["WPS registration UAE","الخطوات؟"],
["عايز إقامة لمراتي في دبي","ولو أبوظبي؟","الأوراق؟"],["أجدد رخصة دبي","ولو الشارقة؟","الخطوات؟"],["عايز إقامة لابني","دبي","والرسوم؟"],["إلغاء تصريح عمل","ليه؟"],["تعديل شريك في رخصة دبي","إزاي؟"],
["إصدار إقامة عبر ICP","الرابط؟"],["تجديد إقامة الأسرة دبي","والزوجة؟","الأوراق؟"],["فتح شركة دبي","ابدأ"],["golden visa investor","how?"],["domestic worker residence Abu Dhabi","documents?"]
];
const browser=await chromium.launch({headless:true,executablePath:process.env.HB_BROWSER_PATH||undefined});const page=await browser.newPage({viewport:{width:430,height:900}});
let lost_context=0,unnecessary_clarification=0,generic_fallback=0,wrong_route=0,dead_end=0,unsupported_claim=0;const records=[];
const generic=/لم أتمكن من مطابقة|ما النتيجة التي تريد الوصول إليها|حدّد نوع المعاملة|حدد نوع المعاملة/i;
async function send(q){const before=await page.locator('[data-chat-role="assistant"]').count();await page.locator("#government-search").fill(q);await page.locator(".hb-chat-send").click();await page.waitForFunction(n=>document.querySelectorAll('[data-chat-role="assistant"]').length>n,before,{timeout:25000});await page.waitForTimeout(250);const bubbles=page.locator('[data-chat-role="assistant"] .hb-chat-bubble');const answer=((await bubbles.last().innerText())||"").trim();const href=await page.locator('[data-chat-role="assistant"]').last().locator('a[href^="/services/"]').first().getAttribute("href").catch(()=>null);return {q,answer,service:href};}
for(let i=0;i<scenarios.length;i++){await page.goto(base+"/ai/?continuity-browser="+i,{waitUntil:"networkidle"});await page.evaluate(()=>sessionStorage.clear());await page.reload({waitUntil:"networkidle"});const turns=[];let active=null;for(let j=0;j<scenarios[i].length;j++){const x=await send(scenarios[i][j]);turns.push(x);if(!x.answer)dead_end++;if(generic.test(x.answer)){generic_fallback++;if(j>0)unnecessary_clarification++;}if(j===0)active=x.service;else if(active&&x.service&&x.service!==active&&!/ولو|بدل|قصدي|actually|instead/i.test(x.q)){lost_context++;wrong_route++;}if(/غير موثق|لا توجد|لن أضع رقم/.test(x.answer)&&/\b\d{3,6}\s*(?:درهم|aed)\b/i.test(x.answer))unsupported_claim++;}records.push({conversation:i+1,turns});}
await browser.close();const totalTurns=records.reduce((n,r)=>n+r.turns.length,0);const metrics={conversations:records.length,total_turns:totalTurns,lost_context_rate:lost_context/totalTurns,unnecessary_clarification_rate:unnecessary_clarification/totalTurns,generic_fallback_rate:generic_fallback/totalTurns,wrong_route_rate:wrong_route/totalTurns,dead_end_rate:dead_end/totalTurns,unsupported_claim_rate:unsupported_claim/totalTurns};
const status=[lost_context,unnecessary_clarification,generic_fallback,wrong_route,dead_end,unsupported_claim].some(count=>count>0)?"FAIL":"PASS";
const report={status,metrics,conversations:records};
await writeFile(resolve(out,"browser-conversational-continuity.json"),JSON.stringify(report,null,2)+"\n","utf8");
// Print evidence before assertions so a failed run remains diagnosable without ZIP access.
console.log(JSON.stringify(report,null,2));
assert.equal(lost_context,0);assert.equal(unnecessary_clarification,0);assert.equal(generic_fallback,0);assert.equal(wrong_route,0);assert.equal(dead_end,0);assert.equal(unsupported_claim,0);