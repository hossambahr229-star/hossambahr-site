import assert from 'node:assert/strict';import{mkdir,writeFile}from'node:fs/promises';
const out='diagnostics/rera-scope-after-2026-10-19';await mkdir(out,{recursive:true});const report={checkedAt:new Date().toISOString(),source:'REAL_PUBLIC_EDGE_ENDPOINT',checks:[],externalModelAcceptance:'NOT_DECLARED'};
async function ask(name,latest,context={},goal=latest,locale='ar'){const started=performance.now();const response=await fetch('https://ngcrkuykfqmiqhsnpcrc.supabase.co/functions/v1/public-ai-concierge',{method:'POST',headers:{'content-type':'application/json',origin:'https://hossambahr.com','x-hb-qa-run':'rera-after-'+Date.now()},body:JSON.stringify({goal,latest_turn:latest,context,history:[],locale,stream:false})});const p=await response.json();assert.equal(response.status,200,name);assert.equal(p.ok,true,name);report.checks.push({name,elapsedMs:performance.now()-started,result:p.result,context:p.goal_context});return p;}
try{
for(const [locale,q]of [['ar','تجديد عقد إيجاري RERA دبي'],['en','renew Ejari contract with RERA Dubai']]){
const p=await ask('Ordinary Ejari remains outside approval guard '+locale,q,{},undefined,locale);assert.equal(p.result.matches[0]?.service_slug,'register-renew-ejari-contract-dubai');assert.notEqual(p.result.understood_intent,'مسار RERA غير متحقق لهذه الحالة');
}
const general=await ask('English approval clarification preserved','RERA approval in Dubai',{},undefined,'en');assert.match(general.result.answer.text,/advertisement permit/);assert.match(general.result.answer.text,/professional practice card/);
const operation=await ask('Unverified approval cancellation remains closed','إلغاء تصريح إعلان RERA دبي');assert.equal(operation.result.matches.length,0);assert.equal(operation.result.answer.fact_status,'MISSING_INFORMATION');
report.status='PASS';
}catch(e){report.status='FAIL';report.error=String(e.stack);process.exitCode=1;}finally{await writeFile(out+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify({status:report.status,checks:report.checks.map(c=>({name:c.name,slug:c.result?.matches?.[0]?.service_slug,engine:c.result?.engine})),error:report.error},null,2));}
