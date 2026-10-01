import assert from "node:assert/strict";
const endpoint=process.env.HB_AI_ENDPOINT||"https://ngcrkuykfqmiqhsnpcrc.supabase.co/functions/v1/public-ai-concierge";\nconst qaRun="semantic-"+Date.now();
async function ask(goal,latestTurn=goal,history=[],context={}){
 const res=await fetch(endpoint,{method:"POST",headers:{"content-type":"application/json","origin":"https://hossambahr.com","x-hb-qa-run":qaRun},body:JSON.stringify({goal,latest_turn:latestTurn,history,context,stream:false})});
 const p=await res.json(); assert.equal(res.status,200,goal); assert.equal(p.ok,true,goal); return p;
}
const spouseBad=/الوالد(?:ين|ة|تي|ي)?|الأب|الاب|الأم|الام|parents?|mother|father/i;
const motherGood=/والدت|الأم|الام|mother/i;
const first=await ask("أريد أن أكفل زوجتي على إقامتي — دبي","دبي",[{role:"user",content:"أريد أن أكفل زوجتي على إقامتي"}]);
const firstText=first.result?.answer?.text||"";
assert.ok(firstText.length>10,"spouse final answer missing");
assert.doesNotMatch(firstText,spouseBad,"spouse final answer drifted to parents");
assert.equal(first.goal_context?.relationship,"wife");
assert.equal(first.result?.matches?.[0]?.jurisdiction?.code,"AE-DU");
const second=await ask("أريد أن أكفل زوجتي على إقامتي — دبي — لا، قصدي والدتي","لا، قصدي والدتي",[
 {role:"user",content:"أريد أن أكفل زوجتي على إقامتي"},{role:"assistant",content:firstText},{role:"user",content:"دبي"}
],{relationship:"wife",jurisdiction_code:"AE-DU"});
const secondText=second.result?.answer?.text||"";
assert.equal(second.goal_context?.relationship,"mother");
assert.match(secondText,motherGood,"mother correction absent from final answer");
const relations=["زوجتي","مراتي","زوجي","جوزي","ابني","بنتي","أولادي","أمي","والدتي","أبي","والدي","الوالدين"];
const emirates=["دبي","أبوظبي","الشارقة","عجمان","رأس الخيمة","الفجيرة","أم القيوين"];
const results=[{name:"spouse-dubai",text:firstText,relationship:first.goal_context.relationship,service:first.result?.matches?.[0]?.service_slug},{name:"correct-mother",text:secondText,relationship:second.goal_context.relationship,service:second.result?.matches?.[0]?.service_slug}];
for(const relation of relations){
 for(const emirate of emirates){
  const goal="أريد أكفل "+relation+" على إقامتي — "+emirate;
  const p=await ask(goal,emirate,[{role:"user",content:"أريد أكفل "+relation+" على إقامتي"}]);
  const text=p.result?.answer?.text||""; assert.ok(text.length>10,goal+" final answer missing");
  if(["زوجتي","مراتي","زوجي","جوزي","ابني","بنتي","أولادي"].includes(relation)) assert.doesNotMatch(text,spouseBad,goal+" drifted to parents");
  results.push({relation,emirate,relationship:p.goal_context?.relationship,jurisdiction:p.result?.matches?.[0]?.jurisdiction?.code,service:p.result?.matches?.[0]?.service_slug,text});
 }
}
console.log(JSON.stringify({status:"PASS",total:results.length,original:{input:["أريد أن أكفل زوجتي على إقامتي","دبي"],final_answer:firstText},correction:{input:"لا، قصدي والدتي",final_answer:secondText},results},null,2));
