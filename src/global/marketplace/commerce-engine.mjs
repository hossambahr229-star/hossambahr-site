export function calculateCommission({rule,baseAmount}){
  const amount=Number(baseAmount);
  if(!Number.isFinite(amount)||amount<0)throw new Error("invalid base amount");
  if(!rule||Number(rule.value)<0)throw new Error("invalid commission rule");
  if(rule.calculationType==="fixed")return Number(rule.value);
  if(rule.calculationType==="percentage")return Math.round(amount*Number(rule.value))/100;
  throw new Error("unsupported commission type");
}

export function batchProgress({totalItems=0,completedItems=0,failedItems=0}){
  const total=Math.max(0,Number(totalItems)||0);
  if(!total)return {percent:0,complete:false};
  const finished=Math.min(total,(Number(completedItems)||0)+(Number(failedItems)||0));
  return {percent:Math.round((finished/total)*100),complete:finished>=total};
}
