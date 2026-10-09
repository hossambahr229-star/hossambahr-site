import{mkdir,writeFile}from'node:fs/promises';
const out='artifacts/live-ejari-diagnosis';await mkdir(out,{recursive:true});
const prompt='أريد تسجيل عقد إيجاري في دبي',endpoint='https://ngcrkuykfqmiqhsnpcrc.supabase.co/functions/v1/public-ai-concierge';
const response=await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json',origin:'https://hossambahr.com','x-hb-qa-run':'ejari-failed-case-'+Date.now()},body:JSON.stringify({goal:prompt,latest_turn:prompt,history:[],context:{},stream:false})});
const raw=await response.text();let body;try{body=JSON.parse(raw)}catch{body={nonJson:raw.slice(0,1000)}}
const report={capturedAt:new Date().toISOString(),source:'LIVE_PRODUCTION',prompt,status:response.status,body,scope:'One previously failed public Ejari catalog case only; no auth, upload or transaction.'};
await writeFile(out+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
