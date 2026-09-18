export function evaluateScenarioOption({option,rules=[],costItems=[]}){
  const violations=[];
  for(const rule of rules){
    if(rule.required && (option[rule.field]==null || option[rule.field]===""))violations.push(rule.message||`Missing ${rule.field}`);
    if(rule.allowedValues && option[rule.field]!=null && !rule.allowedValues.includes(option[rule.field]))violations.push(rule.message||`Invalid ${rule.field}`);
  }
  const total=costItems.reduce((sum,item)=>sum+Number(item.amount||0),0);
  return {
    optionKey:option.key,
    jurisdictionCode:option.jurisdictionCode||null,
    estimatedCost:{currency:option.currency||"AED",total},
    constraints:violations,
    eligibleForReview:violations.length===0
  };
}

export function compareScenarioOptions(results=[]){
  return results.map((r)=>({
    optionKey:r.optionKey,
    jurisdictionCode:r.jurisdictionCode,
    estimatedCost:r.estimatedCost,
    constraintCount:(r.constraints||[]).length,
    eligibleForReview:r.eligibleForReview
  }));
}
