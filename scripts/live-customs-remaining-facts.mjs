import{mkdir,writeFile}from'node:fs/promises';
const out='artifacts/live-customs-remaining-facts';await mkdir(out,{recursive:true});
const services=[{"slug":"dubai-customs-business-registration","source":"https://www.dubaicustoms.gov.ae/en/mobile/Pages/ServiceDescription.aspx?serviceid=17","fees":"100 درهم، إضافة إلى 20 درهمًا للمعرفة والابتكار وفق بطاقة الخدمة.","duration":"يوم عمل واحد","nameAr":"تسجيل منشأة لدى جمارك دبي","nameEn":"Request Business Registration","feesEn":"AED 100, plus AED 20 in knowledge and innovation fees, according to the service card.","durationEn":"One working day"},{"slug":"submit-customs-declaration-dubai","source":"https://www.dubaicustoms.gov.ae/en/mobile/Pages/ServiceDescription.aspx?serviceid=18","fees":"من 15 إلى 100 درهم بحسب نوع البيان وقناة الشحن، مع إضافة رسوم المعرفة والابتكار عند انطباقها.","duration":"ساعتا عمل وفق بطاقة الخدمة","nameAr":"تقديم بيان جمركي في دبي","nameEn":"Submit Customs Declaration","feesEn":"AED 15–100 according to declaration type and shipping channel, plus knowledge and innovation fees where applicable.","durationEn":"Two working hours according to the service card"}],checks=[];
for(const service of services)for(const locale of ['ar','en'])for(const focus of ['fees','duration']){
 const prompt=(locale==='ar'?service.nameAr+'. ':service.nameEn+' from Dubai Customs. ')+(focus==='fees'?(locale==='ar'?'ما الرسوم الحكومية؟':'What are the government fees?'):(locale==='ar'?'كم المدة؟':'What is the processing time?'));
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
const report={capturedAt:new Date().toISOString(),source:'LIVE_PRODUCTION',passed:checks.length===8&&checks.every(x=>!x.failures.length),checks,scope:'Newly reviewed registration/declaration public AI fee/duration cases only; no submissions or private account access.',externalModelGate:checks.every(x=>x.engine?.external_model_used===true)?'PASS':'NOT_PASSED'};
await writeFile(out+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));if(!report.passed)process.exitCode=1;
