import {mkdir,writeFile} from 'node:fs/promises';
const out='diagnostics/provider-current-20261107';
const report={checkedAt:new Date().toISOString(),attempts:1};
try{
 const query='إقامة زوجتي وأولادي في دبي';
 const response=await fetch('https://ngcrkuykfqmiqhsnpcrc.supabase.co/functions/v1/public-ai-concierge',{method:'POST',signal:AbortSignal.timeout(45000),headers:{'content-type':'application/json',origin:'https://hossambahr.com','x-hb-qa-run':'provider-status-20261107'},body:JSON.stringify({goal:query,latest_turn:query,history:[],context:{},stream:false})});
 const body=await response.json();
 const engine=body.result?.engine;
 const failure=engine?.provider_failure;
 Object.assign(report,{httpStatus:response.status,externalModelUsed:engine?.external_model_used??null,mode:engine?.mode??null,providerFailure:failure?{status:failure.status,category:failure.category,code:failure.code}:null,service:body.result?.matches?.[0]?.service_slug??null});
}catch(error){report.error=error.name;}
await mkdir(out,{recursive:true});
await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');
