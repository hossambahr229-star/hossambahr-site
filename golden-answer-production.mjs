import assert from "node:assert/strict";

const endpoint = process.env.HB_AI_ENDPOINT || "https://ngcrkuykfqmiqhsnpcrc.supabase.co/functions/v1/public-ai-concierge";

async function ask(goal, latestTurn = goal) {
  const res = await fetch(endpoint, { method:"POST", headers:{"content-type":"application/json","origin":"https://hossambahr.com"}, body:JSON.stringify({goal,latest_turn:latestTurn}) });
  const json = await res.json();
  assert.equal(res.status, 200, goal);
  assert.equal(json.ok, true, goal);
  return json;
}
const cases = [
 ["wife-dubai","أريد أجدد إقامة زوجتي في دبي",{jurisdiction:"AE-DU",authority:"gdrfa-dubai"}],
 ["company-dubai","أريد أفتح شركة في دبي",{jurisdiction:"AE-DU",authority:"det-dubai"}],
 ["employee-transfer","كيف أنقل موظف لشركتي؟",{authority:"mohre",slug:"transfer-work-permit-uae"}],
 ["cancel-employee","أريد ألغي موظف",{authority:"mohre",slug:"cancel-work-permit-uae"}],
 ["abu-dhabi-authority","إقامتي أبوظبي هل أراجع ICP أم GDRFA؟",{authority:"icp"}],
 ["ajman-cafeteria","أريد رخصة كافتيريا في عجمان",{jurisdiction:"AE-AJ",authority:"ajman-ded"}],
 ["identity-renew","أريد أجدد الهوية",{}],
 ["domestic-worker-az","أريد إقامة عمالة مساعدة في أبوظبي",{goalJurisdiction:"AE-AZ"}],
 ["rak-to-dubai","أريد أنقل رخصة رأس الخيمة إلى دبي",{}],
 ["dubai-fines-mercy","أريد أعمل استرحام مخالفات في دبي",{jurisdiction:"AE-DU"}],
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
 assert.ok(row.answer.length>15,name+" answer missing");
 if(row.confidence==="high") assert.equal(row.source_backed,true,name+" high confidence without source");
 results.push(row);
}
const first=await ask("أريد أجدد إقامة زوجتي في دبي");
const base=first.goal_context.safe_goal;
for(const follow of ["كم الرسوم؟","والأوراق؟","كم تستغرق؟","ومن الجهة؟","هل أحتاج موافقة؟"]) {
 const p=await ask(base+" — "+follow,follow); const a=p.result?.answer||{}; const m=p.result?.matches?.[0]||{};
 assert.equal(m.jurisdiction?.code,"AE-DU","follow-up lost Dubai context: "+follow);
 assert.equal(m.authority?.key,"gdrfa-dubai","follow-up lost GDRFA context: "+follow);
 assert.ok(a.text?.length>15,"follow-up answer missing: "+follow);
 if(follow.includes("الرسوم") && a.fact_status==="MISSING_INFORMATION") assert.doesNotMatch(a.text,/\b\d{2,}\b/,"invented fee");
 results.push({name:"follow-up",q:follow,focus:a.focus,status:a.fact_status,answer:a.text,service:m.service_slug,authority:m.authority?.key});
}
console.log(JSON.stringify({total:results.length,results},null,2));
