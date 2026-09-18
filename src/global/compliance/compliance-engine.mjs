export function evaluateCompliance({controls=[],facts={},evidenceRefs=[]}){
  return controls.filter((c)=>c.active!==false).map((control)=>{
    const required=control.requiredFacts||[];
    const missing=required.filter((field)=>facts[field]==null || facts[field]==="");
    return {
      controlKey:control.controlKey,
      severity:control.severity||"medium",
      status:missing.length?"open":"resolved",
      missing,
      evidenceRefs:[...evidenceRefs]
    };
  });
}

export function complianceHealth(findings=[]){
  const weights={low:1,medium:3,high:7,critical:15};
  const open=findings.filter((f)=>!["resolved","false_positive"].includes(f.status));
  const penalty=open.reduce((sum,f)=>sum+(weights[f.severity]||3),0);
  return {
    score:Math.max(0,100-penalty),
    open:open.length,
    critical:open.filter((f)=>f.severity==="critical").length
  };
}
