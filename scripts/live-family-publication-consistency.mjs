import{mkdir,writeFile}from'node:fs/promises';
const out='artifacts/live-family-publication-consistency';await mkdir(out,{recursive:true});
const services=[{"slug":"family-residency-uae","source":"https://www.gdrfad.gov.ae/en/services/bf409606-56e2-11ea-0320-0050569629e8","fees":"رسم تصريح الإقامة: 200 درهم، و10 دراهم درهم معرفة، و10 دراهم درهم ابتكار، و500 درهم رسم داخل الدولة عند انطباقه، و20 درهم توصيل. تزيد رسوم الإصدار 100 درهم سنويًا عندما تتجاوز الإقامة سنتين.","duration":"مدة الإنجاز المتوقعة المنشورة رسميًا: 48 ساعة.","feesEn":"Residence permit fee: AED 200; AED 10 knowledge fee, AED 10 innovation fee, AED 500 in-country fee where applicable, and AED 20 delivery. The issuance fee increases by AED 100 annually when the residence exceeds two years.","durationEn":"Officially published expected completion time: 48 hours.","nameAr":"إصدار إقامة لأفراد الأسرة في دبي","nameEn":"Family residence permit issuance in Dubai"}],checks=[];
for(const service of services)for(const locale of ['en'])for(const focus of ['fees','duration']){
 const prompt=(locale==='ar'?service.nameAr+'. ':service.nameEn+' with GDRFA. ')+(focus==='fees'?(locale==='ar'?'ما الرسوم الحكومية؟':'What are the government fees?'):(locale==='ar'?'كم المدة؟':'What is the processing time?'));
 try{const response=await fetch('https://ngcrkuykfqmiqhsnpcrc.supabase.co/functions/v1/public-ai-concierge',{method:'POST',signal:AbortSignal.timeout(90000),headers:{'content-type':'application/json',origin:'https://hossambahr.com'},body:JSON.stringify({goal:prompt,latest_turn:prompt,context:{},history:[],stream:false})});
 const body=await response.json(),r=body.result,answer=r?.answer,failures=[];
 if(response.status!==200||!body.ok||r?.matches?.[0]?.service_slug!==service.slug)failures.push('Wrong service identity or API failure');
 if(answer?.grounded!==true||answer?.fact_status!=='VERIFIED_FACT'||answer?.focus!==focus)failures.push('Wrong grounded fact focus');
 if(answer?.evidence?.policy_version!==1||answer?.evidence?.source_url!==service.source)failures.push('Reviewed policy/source absent');
 if(!String(answer?.text).includes(service[focus+(locale==='en'?'En':'')]))failures.push('Reviewed recorded fact absent');
 if(locale==='en'&&/[\u0600-\u06ff]/.test(String(answer?.text)))failures.push('English translation absent');
 checks.push({slug:service.slug,locale,focus,prompt,status:response.status,answer,engine:r?.engine,failures});
 }catch(error){checks.push({slug:service.slug,locale,focus,failures:[String(error)]})}
}
const report={capturedAt:new Date().toISOString(),source:'LIVE_PRODUCTION',passed:checks.length===2&&checks.every(x=>!x.failures.length),checks,scope:'Only two newly translated English family residence fee/time answers from existing policy version 1; no re-test of accepted Arabic AI or changes to policy, eligibility, documents or workflows.',externalModelGate:checks.every(x=>x.engine?.external_model_used===true)?'PASS':'NOT_PASSED'};
await writeFile(out+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));if(!report.passed)process.exitCode=1;
