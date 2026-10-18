import {mkdir,writeFile} from 'node:fs/promises';
const out='diagnostics/provider-current-2026-10-19';await mkdir(out,{recursive:true});
const prompt='I need a real estate professional practice card in Dubai';
const response=await fetch('https://ngcrkuykfqmiqhsnpcrc.supabase.co/functions/v1/public-ai-concierge',{method:'POST',headers:{'content-type':'application/json',origin:'https://hossambahr.com'},body:JSON.stringify({goal:prompt,latest_turn:prompt,history:[],context:{},stream:false}),signal:AbortSignal.timeout(90000)});
const body=await response.json(),result=body.result;
const report={at:new Date().toISOString(),http:response.status,ok:body.ok,service:result?.matches?.[0]?.service_slug,grounding:result?.grounding,engine:result?.engine,externalModelAcceptance:result?.engine?.external_model_used===true?'USED_NOT_FULL_ACCEPTANCE':'NOT_PASSED',scope:'One current provider-status check only. A workflow completion is not external-model PASS.'};
await writeFile(out+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
if(response.status!==200||!body.ok)process.exitCode=1;
