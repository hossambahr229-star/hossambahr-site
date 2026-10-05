import assert from "node:assert/strict";

const endpoint = process.env.HB_AI_ENDPOINT || "https://ngcrkuykfqmiqhsnpcrc.supabase.co/functions/v1/public-ai-concierge";

async function ask(goal, latestTurn = goal, context = {}) {
  const res = await fetch(endpoint, { method:"POST", headers:{"content-type":"application/json","origin":"https://hossambahr.com"}, body:JSON.stringify({goal,latest_turn:latestTurn,context}) });
  const json = await res.json();
  assert.equal(res.status, 200, goal);
  assert.equal(json.ok, true, goal);
  return json;
}
const cases = [
 ["golden-investor-canonical-en","Issuing a golden residence permit (investors) in Dubai",{jurisdiction:"AE-DU",authority:"gdrfa-dubai",slug:"golden-residency-uae"}],
 ["wife-dubai","أريد أجدد إقامة زوجتي في دبي",{jurisdiction:"AE-DU",authority:"gdrfa-dubai"}],
 ["company-dubai","أريد أفتح شركة في دبي",{jurisdiction:"AE-DU",authority:"det-dubai"}],
 ["employee-transfer","كيف أنقل موظف لشركتي؟",{authority:"mohre",slug:"transfer-work-permit-uae"}],
 ["cancel-employee","أريد ألغي موظف",{authority:"mohre",slug:"cancel-work-permit-uae"}],
 ["abu-dhabi-authority","إقامتي أبوظبي هل أراجع ICP أم GDRFA؟",{authority:"icp"}],
 ["ajman-cafeteria","أريد رخصة كافتيريا في عجمان",{jurisdiction:"AE-AJ",authority:"ajman-ded",slug:"ajman-commercial-license-issuance"}],
 ["ajman-cafeteria-dialect","عايز رخصة كافتيريا في عجمان",{jurisdiction:"AE-AJ",authority:"ajman-ded",slug:"ajman-commercial-license-issuance"}],
 ["identity-renew","أريد أجدد الهوية",{}],
 ["domestic-worker-az","أريد إقامة عمالة مساعدة في أبوظبي",{goalJurisdiction:"AE-AZ"}],
 ["rak-to-dubai","أريد أنقل رخصة رأس الخيمة إلى دبي",{}],
 ["dubai-fines-mercy","أريد أعمل استرحام مخالفات في دبي",{goalJurisdiction:"AE-DU",unsupported:true}],
 ["add-partner","أريد أضيف شريك",{}]
];
const results=[];
for (const [name,q,expect] of cases) {
 const p=await ask(q); const m=p.result?.matches?.[0]||{}; const a=p.result?.answer||{}; const g=p.result?.grounding||{};
 const row={name,q,service:m.service_slug||null,jurisdiction:m.jurisdiction?.code||null,authority:m.authority?.key||null,confidence:p.result?.confidence,answer:a.text||"",status:g.status,source_backed:g.source_backed};
 if(expect.goalJurisdiction) assert.equal(p.goal_context?.jurisdiction_hint,expect.goalJurisdiction,name);
 if(expect.slug) assert.equal(row.service,expect.slug,name);
 if(expect.jurisdiction) assert.equal(row.jurisdiction,expect.jurisdiction,name);
 if(expect.authority) assert.equal(row.authority,expect.authority,name);
 if(expect.unsupported){ assert.equal(row.service,null,name+" invented unsupported service"); assert.equal(row.authority,null,name+" invented unsupported authority"); }
 assert.ok(row.answer.length>15,name+" answer missing");
 if(row.confidence==="high") assert.equal(row.source_backed,true,name+" high confidence without source");
 results.push(row);
}
const first=await ask("أريد أجدد إقامة زوجتي في دبي");
const base=first.goal_context.safe_goal;
const conversationContext={jurisdiction_code:first.goal_context.jurisdiction_hint,relationship:first.goal_context.relationship,entity:first.goal_context.entity,service_slug:first.goal_context.service_slug,authority_key:first.goal_context.authority_key,action:first.goal_context.action,intent:first.goal_context.intent,service_family:first.goal_context.service_family};
for(const follow of ["كم الرسوم؟","والأوراق؟","كم تستغرق؟","ومن الجهة؟","هل أحتاج موافقة؟"]) {
 const p=await ask(base+" — "+follow,follow,conversationContext); const a=p.result?.answer||{}; const m=p.result?.matches?.[0]||{};
 assert.equal(m.jurisdiction?.code,"AE-DU","follow-up lost Dubai context: "+follow);
 assert.equal(m.authority?.key,"gdrfa-dubai","follow-up lost GDRFA context: "+follow);
 assert.ok(a.text?.length>15,"follow-up answer missing: "+follow);
 if(follow.includes("الرسوم") && a.fact_status==="MISSING_INFORMATION") assert.doesNotMatch(a.text,/\b\d{2,}\b/,"invented fee");
 results.push({name:"follow-up",q:follow,focus:a.focus,status:a.fact_status,answer:a.text,service:m.service_slug,authority:m.authority?.key});
}
const investorGoal="Issuing a golden residence permit (investors) in Dubai";
const investorContext={service_slug:"golden-residency-uae",jurisdiction_code:"AE-DU",authority_key:"gdrfa-dubai",action:"issue",subject_role:"investor"};
for(const [question,focus,pattern] of [["What are the fees?","fees",/1[,.]?100/],["How long does it take?","duration",/5/]]){
 const p=await ask(investorGoal+" — "+question,question,investorContext),m=p.result?.matches?.[0],a=p.result?.answer;
 assert.equal(m?.service_slug,"golden-residency-uae",question+" changed service");
 assert.equal(a?.focus,focus);assert.equal(a?.fact_status,"VERIFIED_FACT",question+" missing reviewed source rule");assert.match(a.text,pattern);
 assert.ok(a.evidence?.supporting_rule?.source_refs?.includes("https://www.gdrfad.gov.ae/en/services/8ea80da4-f43e-11eb-0320-0050569629e8"));
 results.push({name:"golden-investor-follow-up",q:question,focus,status:a.fact_status,answer:a.text,service:m.service_slug,authority:m.authority?.key});
}
console.log(JSON.stringify({total:results.length,results},null,2));
