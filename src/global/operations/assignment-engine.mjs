export function scoreAssignee({ assignee, caseContext }) {
  let score=0;
  if(!assignee?.active)return -Infinity;
  if((assignee.jurisdictions||[]).includes(caseContext.jurisdictionCode))score+=40;
  if((assignee.serviceTags||[]).includes(caseContext.serviceTag))score+=35;
  if(Number.isFinite(assignee.openWork))score+=Math.max(0,20-Math.min(20,assignee.openWork));
  if(assignee.priorityEligible===false && ["high","urgent"].includes(caseContext.priority))score-=100;
  return score;
}

export function selectAssignee({ candidates=[], caseContext }) {
  const ranked=candidates
    .map((assignee)=>({assignee,score:scoreAssignee({assignee,caseContext})}))
    .filter((x)=>Number.isFinite(x.score))
    .sort((a,b)=>b.score-a.score);
  if(!ranked.length)throw new Error("no eligible assignee");
  return ranked[0];
}

export function slaState({ createdAt, policy, now=new Date() }) {
  const ageMinutes=(now-new Date(createdAt))/60000;
  const completion=policy?.targetCompletionMinutes;
  const escalation=policy?.escalationAfterMinutes;
  return {
    ageMinutes,
    breached:Number.isFinite(completion)&&ageMinutes>completion,
    escalate:Number.isFinite(escalation)&&ageMinutes>escalation
  };
}
