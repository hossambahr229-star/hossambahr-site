import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { chromium } from 'playwright';
const output='artifacts/live-unfinished-acceptance';
await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.HB_BROWSER_PATH||undefined});
const prior=JSON.parse(await readFile(output+'/report.json','utf8').catch(()=>'{}'));
const report={...prior,capturedAt:new Date().toISOString(),source:'LIVE_PRODUCTION',externalModel:'NOT_VERIFIED',privateWorkspace:'AUTH_SESSION_UNAVAILABLE',documentIntelligence:'NOT_VERIFIED',tracking:'AUTH_SESSION_UNAVAILABLE',finalPass:false};
try{
 const context=await browser.newContext({viewport:{width:1440,height:960}});
 const page=await context.newPage();page.setDefaultTimeout(20000);
 await page.goto('https://hossambahr.com/ai/',{waitUntil:'networkidle'});
 const backendResponse=page.waitForResponse(response=>response.request().method()==='POST'&&response.url().includes('/public-ai-concierge'),{timeout:90000});
 await page.locator('textarea[name=goal]').fill('أريد إصدار إقامة لزوجتي في دبي. أنا مقيم وأريد معرفة المسار المناسب.');
 await page.locator('.hb-chat-send').click();
 const response=await backendResponse;
 const text=await response.text();
 const payloads=[];
 try{payloads.push(JSON.parse(text));}catch{
  for(const line of text.split('\n').filter(line=>line.trim())){
   try{payloads.push(JSON.parse(line.startsWith('data:')?line.slice(5).trim():line.trim()));}catch{}
  }
 }
 const evidence=[];
 function scan(value,path='root'){
  if(!value||typeof value!=='object')return;
  for(const [key,item]of Object.entries(value)){
   if(['external_model_used','provider_failure','fallback_reason','mode','code','type','status','model'].includes(key)&&(typeof item!=='object'||key==='provider_failure'))evidence.push({path:path+'.'+key,value:item});
   if(item&&typeof item==='object')scan(item,path+'.'+key);
  }
 }
 payloads.forEach(value=>scan(value));
 const terminal=payloads.filter(value=>['done','fallback'].includes(value.type)).at(-1);
 const finalEngine=terminal?.engine||terminal?.result?.engine||payloads.at(-1)?.result?.engine;
 report.externalModel=finalEngine?.external_model_used===true?'EXTERNAL_MODEL_OBSERVED':finalEngine?.external_model_used===false?'EXTERNAL_MODEL_NOT_USED':'NOT_VERIFIED';
 report.terminalFrame=terminal?.type||null;
 report.aiResponse={httpStatus:response.status(),metadata:evidence,providerAcceptance:'A single observation does not close the full strict semantic gate.'};
 await page.locator('.hb-chat-message--assistant:not([data-pending])').last().waitFor({timeout:90000});
 await page.screenshot({path:output+'/ai-response.png',fullPage:true});
 if(!prior.anonymousDocumentBoundary){
 // Synthetic PDF only; verify the anonymous client does not upload it.
 let documentRequests=0;
 page.on('request',request=>{if(request.method()==='POST'&&request.url().includes('/document-ai'))documentRequests++;});
 await page.locator('#hb-ai-document-input').setInputFiles({name:'synthetic-public-test.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4\n% synthetic empty acceptance probe\n%%EOF')});
 await page.locator('.hb-ai-document-analyze').click();
 const blocked=page.getByText('تحليل PDF والصور قد يتضمن بيانات حساسة، لذلك يتطلب تسجيل الدخول. لن أرفع الملف أو أحلله قبل تسجيل الدخول.',{exact:true});
 await blocked.waitFor();
 report.anonymousDocumentBoundary={loginRequiredMessageVisible:true,documentRequests,syntheticFile:true};
 report.documentIntelligence='AUTHENTICATED_ANALYSIS_NOT_VERIFIED';
 await page.screenshot({path:output+'/document-login-boundary.png',fullPage:true});
 await page.goto('https://hossambahr.com/account/',{waitUntil:'networkidle'});
 report.accountBoundary={url:page.url(),passwordFields:await page.locator('input[type=password]').count(),emailFields:await page.locator('input[type=email]').count(),authenticatedSessionProvided:false};
 await page.screenshot({path:output+'/account-anonymous.png',fullPage:true});
 }else{report.anonymousDocumentBoundary=prior.anonymousDocumentBoundary;report.accountBoundary=prior.accountBoundary;report.documentIntelligence=prior.documentIntelligence;report.preservedBoundaryEvidenceAt=prior.capturedAt;}
}catch(error){report.captureError=String(error);}
finally{await writeFile(output+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await browser.close();}
