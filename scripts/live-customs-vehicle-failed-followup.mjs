import{mkdir,writeFile}from'node:fs/promises';
const out='artifacts/live-customs-vehicle-failed-followup';await mkdir(out,{recursive:true});
const source='https://www.dubaicustoms.gov.ae/en/mobile/Pages/ServiceDescription.aspx?serviceid=54',checks=[];
for(const locale of ['ar','en'])for(const focus of ['fees','duration']){
 const prompt=(locale==='ar'?'شهادة تخليص مركبة من جمارك دبي. ':'Request Vehicle Clearance Certificate from Dubai Customs. ')+(focus==='fees'?(locale==='ar'?'ما الرسوم الحكومية؟':'What are the government fees?'):(locale==='ar'?'كم المدة؟':'What is the processing time?'));
 try{const response=await fetch('https://ngcrkuykfqmiqhsnpcrc.supabase.co/functions/v1/public-ai-concierge',{method:'POST',signal:AbortSignal.timeout(90000),headers:{'content-type':'application/json',origin:'https://hossambahr.com'},body:JSON.stringify({goal:prompt,latest_turn:prompt,context:{},history:[],stream:false})});
 const body=await response.json(),r=body.result,answer=r?.answer,failures=[];
 if(response.status!==200||!body.ok||r?.matches?.[0]?.service_slug!=='vehicle-clearance-certificate-dubai-customs')failures.push('Wrong service identity or API failure');
 if(answer?.grounded!==true||answer?.fact_status!=='VERIFIED_FACT'||answer?.focus!==focus)failures.push('Wrong grounded fact focus');
 if(answer?.evidence?.policy_version!==2||answer?.evidence?.source_url!==source)failures.push('Reviewed policy/source absent');
 if(focus==='fees'&&!String(answer?.text).includes('30'))failures.push('Recorded fee absent');
 if(focus==='duration'&&!/(فوري|immediate)/i.test(String(answer?.text)))failures.push('Recorded duration absent');
 if(locale==='en'&&/[\u0600-\u06ff]/.test(String(answer?.text)))failures.push('English translation absent');
 checks.push({locale,focus,prompt,status:response.status,answer,engine:r?.engine,failures});
 }catch(error){checks.push({locale,focus,failures:[String(error)]})}
}
const report={capturedAt:new Date().toISOString(),source:'LIVE_PRODUCTION',passed:checks.length===4&&checks.every(x=>!x.failures.length),checks,scope:'Actual newly completed public AI fee/duration rules only. No government transaction, login, message or upload submitted.',externalModelGate:checks.every(x=>x.engine?.external_model_used===true)?'PASS':'NOT_PASSED'};
await writeFile(out+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));if(!report.passed)process.exitCode=1;
