import {standingAuthorizationAllows} from "../authorization/standing-authority.mjs";

export function automationDecision({policy,authorization,organizationId=null}){
  if(!policy?.enabled)return {allowed:false,status:"blocked",reason:"policy_disabled"};
  if(["high","critical"].includes(policy.riskClass))return {allowed:false,status:"needs_approval",reason:"risk_requires_approval"};
  if(!policy.requiresStandingAuthorization)return {allowed:true,status:"queued",reason:null};
  const allowed=standingAuthorizationAllows({
    authorization,
    scope:policy.requiredScope,
    riskLevel:policy.riskClass,
    organizationId,
    actionClass:policy.actionType
  });
  return allowed
    ? {allowed:true,status:"queued",reason:null}
    : {allowed:false,status:"blocked",reason:"standing_authorization_missing_or_insufficient"};
}

export function automationIdempotencyKey({policyKey,entityId,eventId,occurrence=null}){
  const parts=[policyKey,entityId,eventId,occurrence||""].map((v)=>String(v||"").trim());
  if(parts.slice(0,3).some((v)=>!v))throw new Error("policyKey, entityId and eventId are required");
  return parts.join(":");
}

export function nextAutomationState(current,event){
  const transitions={
    queued:{start:"running",cancel:"cancelled"},
    running:{complete:"completed",fail:"failed",block:"blocked",approval:"needs_approval",cancel:"cancelled"},
    blocked:{retry:"queued",cancel:"cancelled"},
    needs_approval:{approve:"queued",reject:"cancelled"},
    failed:{retry:"queued"},
    completed:{},
    cancelled:{}
  };
  const next=transitions[current]?.[event];
  if(!next)throw new Error(`invalid automation transition ${current} -> ${event}`);
  return next;
}
