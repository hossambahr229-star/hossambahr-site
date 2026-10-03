import assert from "node:assert/strict";
const endpoint=process.env.HB_AI_ENDPOINT||"https://ngcrkuykfqmiqhsnpcrc.supabase.co/functions/v1/public-ai-concierge";
const forbidden=/لم أتمكن من مطابقة|ما النتيجة التي تريد الوصول إليها|حدّد نوع المعاملة|حدد نوع المعاملة/i;
const unsupported=/\b\d{3,6}\s*(?:درهم|aed)\b/i;
const seeds=[
"عايز تأشيرة سياحية 5 سنين","عايز إقامة لمراتي في دبي","أبغي أجدد رخصة شركتي في دبي","عايز أعدل الرخصة في الشارقة","أريد إلغاء رخصة في دبي",
"عايز تصريح عمل لموظف","عايز أنقل موظف","إقامة العاملة المنزلية في أبوظبي","تجديد الهوية الإماراتية","إلغاء إقامة عبر ICP",
"عايز أفتح شركة في عجمان","أبغي رخصة في رأس الخيمة","تجديد رخصة في الفجيرة","إصدار رخصة في أم القيوين","إقامة ذهبية لمستثمر",
"عايز أكفل والدتي في دبي","wife residence Dubai","need work permit UAE","Ejari renewal Dubai","WPS registration"
];
const followups=["الأوراق؟","والرسوم؟","الشروط؟","الخطوات؟","المدة؟"];
let lost_context=0,unnecessary_clarification=0,generic_fallback=0,wrong_route=0,dead_end=0,unsupported_claim=0,totalTurns=0;
const samples=[];
async function turn(message,s,qa){
 const goal=[s.goal,...s.users,message].filter(Boolean).join(" — ").slice(0,800);
 const r=await fetch(endpoint,{method:"POST",headers:{"content-type":"application/json","origin":"https://hossambahr.com","x-hb-qa-run":qa},body:JSON.stringify({goal,latest_turn:message,history:s.history.slice(-8),context:s.context,stream:false})});
 const p=await r.json(); assert.equal(r.status,200,message); totalTurns++;
 const answer=p.result?.answer?.text||""; const match=p.result?.matches?.[0]||null;
 if(!answer.trim())dead_end++;
 if(forbidden.test(answer))generic_fallback++;
 if(p.result?.answer?.focus==="clarification" && s.context.active_service_id)unnecessary_clarification++;
 if(s.context.active_service_id && !/ولو|بدل|قصدي|actually|instead/i.test(message) && match?.service_slug && match.service_slug!==s.context.active_service_id)lost_context++;
 if(unsupported.test(answer)&&p.result?.answer?.fact_status==="MISSING_INFORMATION")unsupported_claim++;
 s.history.push({role:"user",content:message},{role:"assistant",content:answer});s.history=s.history.slice(-8);s.users.push(message);if(!s.goal)s.goal=message;
 s.context={...s.context,active_service_id:p.goal_context?.active_service_id??match?.service_slug??s.context.active_service_id??null,service_slug:p.goal_context?.active_service_id??match?.service_slug??s.context.service_slug??null,jurisdiction_code:p.goal_context?.jurisdiction_hint??s.context.jurisdiction_code??null,authority_key:match?.authority?.key??p.goal_context?.authority_key??s.context.authority_key??null,relationship:p.goal_context?.relationship??s.context.relationship??null,family_members:p.goal_context?.family_members??s.context.family_members??[],subject_role:p.goal_context?.subject_role??s.context.subject_role??null,action:p.goal_context?.action??s.context.action??null,last_answer_topic:p.goal_context?.last_answer_topic??null,pending_clarification:p.goal_context?.pending_clarification??null,known_facts:p.goal_context?.known_facts??s.context.known_facts??{}};
 return {p,answer,match};
}
for(let i=0;i<100;i++){
 const s={goal:"",users:[],history:[],context:{}};const qa="continuity-"+Date.now()+"-"+i;
 const seed=seeds[i%seeds.length]; const a=await turn(seed,s,qa); const active=a.match?.service_slug;
 const expectedSeed = /أجدد رخصة شركتي في دبي/.test(seed) ? /renew-business-license-dubai/ : /إلغاء رخصة في دبي/.test(seed) ? /cancel-business-license-dubai/ : /إصدار رخصة في أم القيوين/.test(seed) ? /umm-al-quwain-mainland-licensing-official-path/ : null;
 if(expectedSeed && !expectedSeed.test(active||"")) wrong_route++;
 if(/إقامة العاملة المنزلية في أبوظبي/.test(seed) && /complaint|شكوى|عقد-عمل|تصريح-عمل/.test(active||"")) wrong_route++;
 const f=followups[i%followups.length]; const b=await turn(f,s,qa);
 if(active && b.match?.service_slug!==active && !/ولو|بدل|قصدي|actually|instead/i.test(f))wrong_route++;
 if(i<20)samples.push({scenario:i+1,turns:[{q:seed,a:a.answer,service:a.match?.service_slug},{q:f,a:b.answer,service:b.match?.service_slug}]});
}
const exact={goal:"",users:[],history:[],context:{}};const qa="continuity-exact-"+Date.now();
let x=await turn("عايز تأشيرة سياحية 5 سنين",exact,qa);assert.equal(x.match?.service_slug,"إصدار-تأشيرة-سياحية-متعددة-الدخول-لمدة-5-سنوات-عبر-icp");
for(const q of["الأوراق المطلوبة","والرسوم؟","الشروط؟","الخطوات؟","الرابط؟"]){x=await turn(q,exact,qa);assert.equal(x.match?.service_slug,"إصدار-تأشيرة-سياحية-متعددة-الدخول-لمدة-5-سنوات-عبر-icp",q);assert.doesNotMatch(x.answer,forbidden,q);if(/الأوراق/.test(q))assert.match(x.answer,/المتطلبات|المستندات|جواز|غير موثقة/,q);}
console.log(JSON.stringify({diagnostic:true,totalTurns,lost_context,unnecessary_clarification,generic_fallback,wrong_route,dead_end,unsupported_claim,samples},null,2));
assert.equal(lost_context,0);assert.equal(unnecessary_clarification,0);assert.equal(generic_fallback,0);assert.equal(wrong_route,0);assert.equal(dead_end,0);assert.equal(unsupported_claim,0);
console.log(JSON.stringify({status:"PASS",scenarios:101,totalTurns,lost_context_rate:lost_context/totalTurns,unnecessary_clarification_rate:unnecessary_clarification/totalTurns,generic_fallback_rate:generic_fallback/totalTurns,wrong_route_rate:wrong_route/totalTurns,dead_end_rate:dead_end/totalTurns,unsupported_claim_rate:unsupported_claim/totalTurns,samples},null,2));