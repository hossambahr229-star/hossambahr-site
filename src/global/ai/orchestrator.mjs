import { assertAgentScope } from "./agent-contracts.mjs";
import { requiresHumanApproval } from "../core/domain-model.mjs";

export function buildExecutionPlan({ caseId, steps = [], orchestrator = "planner" }) {
  if(!caseId || !Array.isArray(steps) || !steps.length) throw new Error("caseId and steps required");
  const planned=steps.map((step,index)=>{
    const risk=step.risk||{};
    const approval=Boolean(step.requiresApproval||requiresHumanApproval(risk));
    return {
      sequence:index+1,
      key:step.key||`step-${index+1}`,
      agent:step.agent||orchestrator,
      scope:step.scope||"case:read",
      action:step.action,
      dependsOn:[...(step.dependsOn||[])],
      requiresApproval:approval,
      risk
    };
  });
  for(const step of planned)assertAgentScope(step.agent,step.scope);
  return {
    caseId,
    status:"draft",
    steps:planned,
    requiresHumanApproval:planned.some((s)=>s.requiresApproval)
  };
}

export function executablePlanSteps(plan, completedKeys = [], approvedKeys = []) {
  const completed=new Set(completedKeys);
  const approved=new Set(approvedKeys);
  return plan.steps.filter((step)=>
    !completed.has(step.key)
    && step.dependsOn.every((dep)=>completed.has(dep))
    && (!step.requiresApproval||approved.has(step.key))
  );
}

export function assertNoAutonomousSensitiveExecution(step) {
  if(step.requiresApproval) throw new Error("human approval required before sensitive execution");
  return true;
}
