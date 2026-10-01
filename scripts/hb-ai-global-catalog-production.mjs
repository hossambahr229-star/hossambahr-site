import assert from "node:assert/strict";
const endpoint=process.env.HB_AI_ENDPOINT||"https://ngcrkuykfqmiqhsnpcrc.supabase.co/functions/v1/public-ai-concierge";
const run="catalog-"+Date.now();
async function ask(name,prompt){const r=await fetch(endpoint,{method:"POST",headers:{"content-type":"application/json","origin":"https://hossambahr.com","x-hb-qa-run":run},body:JSON.stringify({goal:prompt,latest_turn:prompt,history:[],context:{},stream:false})});const p=await r.json();assert.equal(r.status,200,name);assert.equal(p.ok,true,name);return p}
const cases=[
["trade-issue","عايز أفتح شركة تجارة عامة في دبي",/issue-trade-license-dubai/],
["trade-renew","عايز اجدد الرخصة التجارية للشركة في دبي",/renew-business-license-dubai/],
["trade-amend","I need تعديل الرخصة التجارية للشركة in Dubai",/amend-business-license-dubai/],
["partner","عايز أضيف شريك في شركة بدبي",/add-remove-partner-dubai/],
["liquidation","عايز ألغي الرخصة وأصفي الشركة في دبي",/cancel-business-license-dubai/],
["ejari","أريد تسجيل عقد إيجاري في دبي",/register-renew-ejari-contract-dubai/],
["golden","أريد التقديم على الإقامة الذهبية في الإمارات",/golden-residency-uae/],
["wps","أريد التسجيل والمتابعة في WPS للمنشأة",/التسجيل-والمتابعة-في-wps/],
["work-cancel","أريد إلغاء تصريح عمل الموظف",/cancel-work-permit-uae/],
["work-transfer","أريد نقل تصريح عمل الموظف",/transfer-work-permit-uae/],
["overseas-work","أريد تصريح عمل جديد لموظف من خارج الإمارات",/new-work-permit-overseas-uae/],
["rak-issue","أريد إصدار رخصة اقتصادية في رأس الخيمة",/ras-al-khaimah-license-issuance/],
["ajman-renew","أريد تجديد رخصة تجارية في عجمان",/(ajman-commercial-license-renewal|renew-business-license-ajman)/],
["ad-issue","أريد إصدار رخصة اقتصادية في أبوظبي",/abu-dhabi-economic-license-issuance/],
["fujairah-renew","أريد تجديد رخصة اقتصادية في الفجيرة",/fujairah-economic-license-renewal/],
["sharjah-amend","أريد تعديل رخصة اقتصادية في الشارقة",/sharjah-economic-license-amendment/]
];
const out=[];for(const [name,prompt,expected] of cases){const p=await ask(name,prompt);const slug=p.result?.matches?.[0]?.service_slug||"";assert.match(slug,expected,name+" wrong service "+slug);assert.ok((p.result?.answer?.text||"").length>8,name+" missing answer");out.push({name,slug,authority:p.result?.matches?.[0]?.authority?.key||null})}
console.log(JSON.stringify({status:"PASS",total:out.length,results:out},null,2));