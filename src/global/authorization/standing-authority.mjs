export const AlwaysSensitiveScopes = Object.freeze([
  "payment:capture",
  "payment:refund",
  "bank:transfer",
  "government:submit",
  "signature:apply",
  "contract:sign",
  "consent:grant",
  "consent:revoke",
  "organization:delete",
  "case:delete",
  "document:delete",
  "credential:revoke",
  "policy:publish",
  "finding:accept_risk"
]);

const RISK_ORDER = Object.freeze({low:0,medium:1,high:2,critical:3});

export function isAlwaysSensitiveScope(scope){
  return AlwaysSensitiveScopes.includes(String(scope||""));
}

export function authorizationIsActive(authorization, now=new Date()){
  if(!authorization || authorization.status!=="active")return false;
  if(authorization.validFrom && new Date(authorization.validFrom)>now)return false;
  if(authorization.validUntil && new Date(authorization.validUntil)<=now)return false;
  return true;
}

export function standingAuthorizationAllows({authorization,scope,riskLevel="low",organizationId=null,actionClass=null,now=new Date()}){
  if(!authorizationIsActive(authorization,now))return false;
  if(isAlwaysSensitiveScope(scope))return false;
  if(authorization.organizationId && authorization.organizationId!==organizationId)return false;
  if(!(authorization.allowedScopes||[]).includes(scope))return false;
  if((authorization.deniedScopes||[]).includes(scope))return false;
  if(actionClass && (authorization.allowedActionClasses||[]).length && !(authorization.allowedActionClasses||[]).includes(actionClass))return false;
  const max=RISK_ORDER[authorization.maxRiskLevel||"low"];
  const actual=RISK_ORDER[riskLevel];
  if(max==null || actual==null || actual>max)return false;
  return true;
}

export function buildStandingAuthorization({
  userId,
  authorizationKey="routine-autonomy",
  name="Routine operational autonomy",
  purpose,
  allowedScopes=[],
  deniedScopes=[],
  allowedActionClasses=[],
  maxRiskLevel="low",
  organizationId=null,
  validUntil=null
}){
  if(!userId||!purpose)throw new Error("userId and purpose are required");
  const sanitizedAllowed=allowedScopes.filter((scope)=>!isAlwaysSensitiveScope(scope));
  const sanitizedDenied=[...new Set([...deniedScopes,...AlwaysSensitiveScopes])];
  return {
    userId,
    organizationId,
    authorizationKey,
    name,
    purpose,
    allowedScopes:[...new Set(sanitizedAllowed)],
    deniedScopes:sanitizedDenied,
    allowedActionClasses:[...new Set(allowedActionClasses)],
    maxRiskLevel,
    status:"active",
    validUntil
  };
}
