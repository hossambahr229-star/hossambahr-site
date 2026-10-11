import{mkdir,writeFile}from'node:fs/promises';
const out='artifacts/live-dubai-cancellation-reviewed-facts';await mkdir(out,{recursive:true});
const services=[{"slug":"cancel-residency-permit-uae","source":"https://gdrfad.gov.ae/en/services/0613ab0e-5858-11ea-0320-0050569629e8","fees":"رسم إلغاء تصريح الإقامة 100 درهم، و10 دراهم للمعرفة و10 دراهم للابتكار، وفق بطاقة GDRFA.","duration":"48 ساعة وفق بطاقة GDRFA؛ لم تُحدد أنها ساعات عمل.","feesEn":"The GDRFA card lists AED 100 for residence permit cancellation, AED 10 knowledge fee and AED 10 innovation fee.","durationEn":"48 hours according to the GDRFA card; the card does not specify working hours.","nameAr":"إلغاء تصريح الإقامة الصادر من دبي","nameEn":"Cancel a Dubai residence permit"}],checks=[];
for(const service of services)for(const locale of ['ar','en'])for(const focus of ['fees','duration']){
 const prompt=(locale==='ar'?service.nameAr+'. ':service.nameEn+' with GDRFA. ')+(focus==='fees'?(locale==='ar'?'ما الرسوم الحكومية؟':'What are the government fees?'):(locale==='ar'?'كم المدة؟':'What is the processing time?'));
 try{const response=await fetch('https://ngcrkuykfqmiqhsnpcrc.supabase.co/functions/v1/public-ai-concierge',{method:'POST',signal:AbortSignal.timeout(90000),headers:{'content-type':'application/json',origin:'https://hossambahr.com'},body:JSON.stringify({goal:prompt,latest_turn:prompt,context:{},history:[],stream:false})});
 const body=await response.json(),r=body.result,answer=r?.answer,failures=[];
 if(response.status!==200||!body.ok||r?.matches?.[0]?.service_slug!==service.slug)failures.push('Wrong service identity or API failure');
 if(answer?.grounded!==true||answer?.fact_status!=='VERIFIED_FACT'||answer?.focus!==focus)failures.push('Wrong grounded fact focus');
 if(answer?.evidence?.policy_version!==2||answer?.evidence?.source_url!==service.source)failures.push('Reviewed policy/source absent');
 if(!String(answer?.text).includes(service[focus+(locale==='en'?'En':'')]))failures.push('Reviewed recorded fact absent');
 if(locale==='en'&&/[\u0600-\u06ff]/.test(String(answer?.text)))failures.push('English translation absent');
 checks.push({slug:service.slug,locale,focus,prompt,status:response.status,answer,engine:r?.engine,failures});
 }catch(error){checks.push({slug:service.slug,locale,focus,failures:[String(error)]})}
}
const report={capturedAt:new Date().toISOString(),source:'LIVE_PRODUCTION',passed:checks.length===4&&checks.every(x=>!x.failures.length),checks,scope:'Only newly reviewed Dubai residence cancellation fees and expected hours; no documents, eligibility, grace periods, submissions or private account access.',externalModelGate:checks.every(x=>x.engine?.external_model_used===true)?'PASS':'NOT_PASSED'};
await writeFile(out+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));if(!report.passed)process.exitCode=1;
