export function executiveSnapshot({cases=[],quotes=[],payments=[],findings=[]}){
  const openCases=cases.filter((c)=>!["completed","cancelled"].includes(c.status));
  const blocked=openCases.filter((c)=>["blocked","waiting_customer"].includes(c.status));
  const revenue=payments.filter((p)=>p.status==="succeeded").reduce((sum,p)=>sum+Number(p.amount||0),0);
  const pipeline=quotes.filter((q)=>["sent","accepted"].includes(q.status)).reduce((sum,q)=>sum+Number(q.total||0),0);
  const critical=findings.filter((f)=>f.status!=="resolved"&&f.severity==="critical").length;
  return {openCases:openCases.length,blockedCases:blocked.length,revenue,pipeline,criticalFindings:critical};
}

export function attentionItems(snapshot){
  const items=[];
  if(snapshot.criticalFindings>0)items.push({priority:"urgent",key:"critical_compliance",count:snapshot.criticalFindings});
  if(snapshot.blockedCases>0)items.push({priority:"high",key:"blocked_cases",count:snapshot.blockedCases});
  return items;
}
