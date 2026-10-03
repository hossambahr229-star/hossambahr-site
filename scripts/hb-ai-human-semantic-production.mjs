import assert from "node:assert/strict";
const endpoint=process.env.HB_AI_ENDPOINT||"https://ngcrkuykfqmiqhsnpcrc.supabase.co/functions/v1/public-ai-concierge";
const qaRun="human-semantic-"+Date.now();
let requests=0,directLLM=0,fallback=0;
const samples=[];
async function ask(message,state){
  requests++; assert.ok(requests<=32,"live benchmark request budget exceeded");
  const goal=[state.originalGoal,...state.userTurns,message].filter(Boolean).join(" — ").slice(0,800);
  const res=await fetch(endpoint,{method:"POST",headers:{"content-type":"application/json","origin":"https://hossambahr.com","x-hb-qa-run":qaRun},body:JSON.stringify({goal,latest_turn:message,history:state.history.slice(-8),context:state.context,stream:false})});
  const p=await res.json(); assert.equal(res.status,200,message); assert.equal(p.ok,true,message);
  if(p.result?.engine?.external_model_used===true) directLLM++; else fallback++;
  const answer=p.result?.answer?.text||""; assert.ok(answer.length>8,message+" empty answer");
  state.history.push({role:"user",content:message},{role:"assistant",content:answer});state.history=state.history.slice(-8);
  state.userTurns.push(message); if(!state.originalGoal)state.originalGoal=message;
  state.context={service_slug:p.result?.matches?.[0]?.service_slug??p.goal_context?.service_slug??state.context.service_slug??null,jurisdiction_code:p.goal_context?.jurisdiction_hint??state.context.jurisdiction_code??null,authority_key:p.result?.matches?.[0]?.authority?.key??p.goal_context?.authority_key??state.context.authority_key??null,relationship:p.goal_context?.relationship??state.context.relationship??null,family_members:p.goal_context?.family_members??state.context.family_members??[],entity:p.goal_context?.entity??state.context.entity??null,intent:p.goal_context?.intent??state.context.intent??null,service_family:p.goal_context?.service_family??state.context.service_family??null,action:p.goal_context?.action??state.context.action??null};
  samples.push({message,relationship:p.goal_context?.relationship,family_members:p.goal_context?.family_members,jurisdiction:p.goal_context?.jurisdiction_hint,service:p.result?.matches?.[0]?.service_slug,authority:p.result?.matches?.[0]?.authority?.key,external:p.result?.engine?.external_model_used,answer});
  return p;
}
function state(){return {originalGoal:"",userTurns:[],history:[],context:{}}}
const parentWords=/الوالدين|والدتي|والدي|parents?|mother|father/i;
const fabricatedFee=/\b\d{3,6}\s*(?:درهم|aed)\b/i;

// Egyptian family journey: entity persistence, additions, fees, emirate switch, correction.
{
 const s=state();
 let p=await ask("عايز أكفل مراتي",s);assert.equal(p.goal_context.relationship,"wife");assert.deepEqual(p.goal_context.family_members,["wife"]);assert.equal(p.result.matches.length,0);assert.match(p.result.answer.text,/إمارة|الاماره|الإماره/);
 p=await ask("دبي",s);assert.equal(p.goal_context.relationship,"wife");assert.equal(p.goal_context.jurisdiction_hint,"AE-DU");assert.equal(p.result.matches?.[0]?.authority?.key,"gdrfa-dubai");assert.doesNotMatch(p.result.answer.text,parentWords);
 p=await ask("عندي ولدين كمان",s);assert.equal(p.goal_context.relationship,"children");assert.ok(p.goal_context.family_members.includes("wife"));assert.ok(p.goal_context.family_members.includes("children"));assert.equal(p.result.matches?.[0]?.service_slug,"family-residency-uae");
 p=await ask("طيب الأوراق؟",s);assert.ok(p.goal_context.family_members.includes("wife")&&p.goal_context.family_members.includes("children"));assert.equal(p.goal_context.jurisdiction_hint,"AE-DU");
 p=await ask("والرسوم؟",s);if(p.result.answer?.fact_status==="MISSING_INFORMATION")assert.doesNotMatch(p.result.answer.text,fabricatedFee);
 p=await ask("ولو أبوظبي؟",s);assert.equal(p.goal_context.jurisdiction_hint,"AE-AZ");assert.ok(p.goal_context.family_members.includes("wife")&&p.goal_context.family_members.includes("children"));
 p=await ask("لا، قصدي والدتي",s);assert.equal(p.goal_context.relationship,"mother");assert.deepEqual(p.goal_context.family_members,["mother"]);
}
// Gulf company discovery journey.
{
 const s=state();
 let p=await ask("أبغي أفتح شركة ومب عارف النشاط",s);assert.equal(p.goal_context.relationship,null);
 p=await ask("في دبي",s);assert.equal(p.goal_context.jurisdiction_hint,"AE-DU");
 p=await ask("نشاط تجارة إلكترونية",s);assert.equal(p.goal_context.relationship,null);
 p=await ask("وش الشكل القانوني المناسب؟",s);assert.equal(p.goal_context.jurisdiction_hint,"AE-DU");
 p=await ask("والرسوم الموثقة؟",s);if(p.result.answer?.fact_status==="MISSING_INFORMATION")assert.doesNotMatch(p.result.answer.text,fabricatedFee);
}
// English employment journey.
{
 const s=state();
 let p=await ask("I need to hire a new employee",s);assert.equal(p.goal_context.relationship,null);
 p=await ask("Dubai",s);assert.equal(p.goal_context.jurisdiction_hint,"AE-DU");
 p=await ask("The employee is already inside the UAE",s);assert.equal(p.goal_context.jurisdiction_hint,"AE-DU");
 p=await ask("What documents are verified?",s);assert.ok((p.result.answer?.text||"").length>8);
 p=await ask("Actually I need to cancel the employment process instead",s);assert.equal(p.goal_context.relationship,null);
}
// Mixed language + typo-heavy family journey.
{
 const s=state();
 let p=await ask("عايز اجدد اقامه مراتى ف دبى",s);assert.equal(p.goal_context.relationship,"wife");assert.equal(p.goal_context.jurisdiction_hint,"AE-DU");assert.doesNotMatch(p.result.answer.text,parentWords);
 p=await ask("والعيال؟",s);assert.ok(["children","son","daughter"].includes(p.goal_context.relationship)||p.goal_context.family_members?.length>1);
 p=await ask("fees?",s);if(p.result.answer?.fact_status==="MISSING_INFORMATION")assert.doesNotMatch(p.result.answer.text,fabricatedFee);
 p=await ask("ابوظبى بدل دبى",s);assert.equal(p.goal_context.jurisdiction_hint,"AE-AZ");
 p=await ask("لا رجعها دبي",s);assert.equal(p.goal_context.jurisdiction_hint,"AE-DU");
}
assert.equal(fallback,0,"EXTERNAL_BLOCKER: live human benchmark requires the real external model for every curated turn");
assert.equal(directLLM,requests,"not every curated human turn used the external model");
console.log(JSON.stringify({status:"PASS",requests,directLLM,fallback,journeys:4,samples},null,2));
