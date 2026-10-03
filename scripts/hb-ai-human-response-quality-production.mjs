import assert from "node:assert/strict";
import {performance} from "node:perf_hooks";
const endpoint=process.env.HB_AI_ENDPOINT||"https://ngcrkuykfqmiqhsnpcrc.supabase.co/functions/v1/public-ai-concierge";
const run="human-quality-"+Date.now();
const groups=[
[/family-residency-uae/,["عايز أعمل إقامة لمراتي في دبي","wife visa dubai","كيف اسوي اقامة للزوجة في دبي","مراتي بره البلد وعايز اعملها اقامه دبي","إقامة الزوجة شو المطلوب دبي","ابغي اكفل زوجتي بدبي","إقامه لزوجتي دبي","need residence for my wife in Dubai","زوجتي اقامة دبي","عاوز اطلع اقامة للمدام في دبي"]],
[/sharjah-economic-license-issuance/,["أبي أفتح شركة في الشارقة","ابغي افتح شركة بالشارقة","عايز رخصة جديدة في الشارقة","start company sharjah","issue business license Sharjah","تأسيس شركة الشارقه","محتاج افتح بزنس في الشارقة","ابي رخصه اقتصاديه الشارقه","new company in Sharjah","اصدار رخصة شركة بالشارقة"]],
[/renew-business-license-ajman|ajman-commercial-license-renewal/,["محتاج اجدد الرخصه بعجمان","تجديد رخصة عجمان","renew business license Ajman","رخصتي بعجمان بتنتهي","ابي اجدد رخصتي في عجمان","renew licence ajman","عاوز تجديد الرخصة التجارية عجمان","الرخصه عجمان تجديد","company license renewal Ajman","اجدد ترخيص شركتي بعجمان"]],
[/cancel-work-permit-uae/,["عايز الغي تصريح عمل الموظف","إلغاء تصريح عمل عامل","cancel employee work permit","cancel work permit UAE","ابي الغي تصريح الموظف","تصريح العمل الغاء","الغاء work permit","cancel worker permit","محتاج إلغاء تصريح العمل","عاوز ألغي تصريح موظف"]],
[/transfer-work-permit-uae/,["عايز انقل تصريح عمل الموظف","نقل تصريح عمل","transfer employee work permit","move work permit UAE","ابي انقل تصريح الموظف","تحويل تصريح العمل","نقل work permit","transfer worker permit","محتاج نقل تصريح العمل","عاوز أنقل تصريح موظف"]],
[/golden-residency-uae/,["golden visa for property owner","الإقامة الذهبية مستثمر دبي","عايز جولدن فيزا مستثمر","golden residency investor Dubai","اقامة ذهبية للمستثمر","ابي اقامة ذهبية بدبي كمستثمر","investor golden visa Dubai","جولدن فيزا مالك استثمار دبي","إصدار الإقامة الذهبية مستثمر دبي","golden visa investor"]],
[/register-renew-ejari-contract-dubai/,["اجاري دبي تجديد","تسجيل ايجاري دبي","Ejari renewal Dubai","renew ejari","ابي اسجل إيجاري","عقد ايجاري تسجيل دبي","تجديد عقد إيجاري دبي","ejari registration","عايز اجدد إيجاري","إيجاري بدبي"]],
[/التسجيل-والمتابعة-في-wps/,["wps للمنشأة","نظام حماية الأجور","WPS registration UAE","متابعة wps","ابي اسجل المنشأة في WPS","حماية الاجور للشركة","wps company","تسجيل نظام الأجور","عايز متابعة WPS","wage protection system UAE"]],
[/add-remove-partner-dubai/,["ابي اضيف شريك بالرخصة دبي","إضافة شريك شركة دبي","add partner Dubai company","عايز أدخل شريك في الرخصة","اضافة شريك بالرخصة","new partner trade license Dubai","شريك جديد في شركة دبي","add shareholder Dubai license","محتاج أضيف شريك","إدخال شريك في الرخصة دبي"]],
[null,["عاملة منزلية اقامتها بتخلص","إقامة العاملة المنزلية قربت تنتهي","domestic worker residence expiring","ابي اجدد اقامة الخادمة","عاملة مساعدة اقامتها منتهية","housemaid residence renewal","تجديد اقامة عامل مساعد","إقامة الخادمة تجديد","domestic worker visa renewal","اقامة العاملة المساعدة"]]
];
const cases=groups.flatMap(([expected,prompts])=>prompts.map(prompt=>({expected,prompt})));
assert.equal(cases.length,100);
const answers=new Array(cases.length),latencies=[];let fallback=0,dead=0,wrong=0,unsupported=0;
async function runCase(c,i){
 const t=performance.now();const r=await fetch(endpoint,{method:"POST",signal:AbortSignal.timeout(20000),headers:{"content-type":"application/json","origin":"https://hossambahr.com","x-hb-qa-run":run},body:JSON.stringify({goal:c.prompt,latest_turn:c.prompt,history:[],context:{},stream:false})});latencies.push(performance.now()-t);
 assert.equal(r.status,200,"HTTP "+i);const p=await r.json();const slug=p.result?.matches?.[0]?.service_slug||"";const ans=p.result?.answer?.text||"";
 if(!slug)fallback++;if(!ans||/لم أتمكن من مطابقة طلبك/.test(ans))dead++;
 if(c.expected){if(!c.expected.test(slug)){wrong++;console.error("WRONG",i,c.prompt,slug)}}
 else {if(!/(?:العامل|العاملة|عامل|عاملة)/.test(ans)||!/إمارة|الامارة|الإمارة/.test(ans)){wrong++;console.error("BAD_CLARIFY",i,c.prompt,ans)}}
 if(p.result?.grounding?.no_invention!==true)unsupported++;answers[i]=ans.replace(/\\s+/g," ").trim();
}
for(let i=0;i<cases.length;i+=10)await Promise.all(cases.slice(i,i+10).map((item,j)=>runCase(item,i+j)));
const freq=new Map();for(const a of answers)freq.set(a,(freq.get(a)||0)+1);const duplicate=answers.reduce((n,a)=>n+((freq.get(a)||0)>1?1:0),0)/answers.length;
latencies.sort((a,b)=>a-b);const pct=q=>Math.round(latencies[Math.min(latencies.length-1,Math.floor(q*latencies.length))]);
const metrics={total:cases.length,fallback_rate:fallback/cases.length,dead_end_rate:dead/cases.length,wrong_route_rate:wrong/cases.length,unsupported_claim_guard_failures:unsupported,duplicate_response_rate:duplicate,latency_p50_ms:pct(.5),latency_p95_ms:pct(.95)};
assert.equal(wrong,0,JSON.stringify(metrics));assert.equal(unsupported,0);assert.ok(dead/cases.length<=.10,JSON.stringify(metrics));assert.ok(fallback/cases.length<=.10,JSON.stringify(metrics));
console.log(JSON.stringify({status:"PASS",metrics,samples:cases.slice(0,15).map((c,i)=>({prompt:c.prompt,answer:answers[i]}))},null,2));