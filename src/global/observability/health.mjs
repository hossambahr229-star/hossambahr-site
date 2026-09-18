export const HealthState=Object.freeze({
  HEALTHY:"healthy",
  DEGRADED:"degraded",
  UNHEALTHY:"unhealthy"
});

export function evaluateHealth(checks=[]){
  const failed=checks.filter((c)=>c.status==="failed");
  const degraded=checks.filter((c)=>c.status==="degraded");
  return {
    state:failed.length?HealthState.UNHEALTHY:degraded.length?HealthState.DEGRADED:HealthState.HEALTHY,
    checks,
    checkedAt:new Date().toISOString()
  };
}

export function calculateSlo({total=0,successful=0,target=0.999}){
  const availability=total>0?successful/total:1;
  return {
    availability,
    target,
    met:availability>=target,
    errorBudgetRemaining:Math.max(0,(1-target)-(1-availability))
  };
}

export function traceEnvelope({traceId,spanId,parentSpanId=null,operation,attributes={}}){
  if(!traceId||!spanId||!operation)throw new Error("traceId, spanId and operation required");
  return {traceId,spanId,parentSpanId,operation,attributes,startedAt:new Date().toISOString()};
}
