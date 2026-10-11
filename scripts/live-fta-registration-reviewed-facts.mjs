import{mkdir,writeFile}from'node:fs/promises';
const out='artifacts/live-fta-registration-reviewed-facts';await mkdir(out,{recursive:true});
const services=[{"slug":"corporate-tax-registration-uae","source":"https://tax.gov.ae/ar/services/corporate.tax.registration.aspx","fees":"خدمة التسجيل مجانية وفق بطاقة الهيئة.","duration":"مراجعة الهيئة: 20 يوم عمل من استلام الطلب المكتمل. الزمن المتوقع لتقديم الطلب: 25 دقيقة.","durationEn":"FTA review: 20 working days from receipt of a complete application. Expected application submission time: 25 minutes.","feesEn":"Registration is free according to the FTA service card.","nameAr":"التسجيل في ضريبة الشركات بالإمارات","nameEn":"Corporate Tax Registration"},{"slug":"vat-registration-uae","source":"https://tax.gov.ae/ar/services/vat.registration.aspx","fees":"خدمة التسجيل مجانية وفق بطاقة الهيئة.","duration":"مراجعة الهيئة: 20 يوم عمل من استلام الطلب المكتمل. الزمن المتوقع لتقديم الطلب: 45 دقيقة.","durationEn":"FTA review: 20 working days from receipt of a complete application. Expected application submission time: 45 minutes.","feesEn":"Registration is free according to the FTA service card.","nameAr":"التسجيل في ضريبة القيمة المضافة بالإمارات","nameEn":"VAT Registration"}],checks=[];
for(const service of services)for(const locale of ['ar','en'])for(const focus of ['fees','duration']){
 const prompt=(locale==='ar'?service.nameAr+'. ':service.nameEn+' with the UAE Federal Tax Authority. ')+(focus==='fees'?(locale==='ar'?'ما الرسوم الحكومية؟':'What are the government fees?'):(locale==='ar'?'كم المدة؟':'What is the processing time?'));
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
const report={capturedAt:new Date().toISOString(),source:'LIVE_PRODUCTION',passed:checks.length===8&&checks.every(x=>!x.failures.length),checks,scope:'Newly reviewed FTA registration fee and distinct submission/review times only; no tax liability determination, submissions or private account access.',externalModelGate:checks.every(x=>x.engine?.external_model_used===true)?'PASS':'NOT_PASSED'};
await writeFile(out+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));if(!report.passed)process.exitCode=1;
