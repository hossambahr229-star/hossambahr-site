import {mkdir,writeFile} from 'node:fs/promises';
const out='diagnostics/mohre-fee-source-access-2026-10-19';await mkdir(out,{recursive:true});const results=[];
for(const [name,url]of [['domestic-permit','https://mohre.gov.ae/en/services/issuance-of-a-new-work-permit-domestic-workers-2022'],['domestic-contract','https://mohre.gov.ae/en/services/issuance-of-a-new-employment-contract-domestic-worker-2022']]){
 try{const response=await fetch(url,{signal:AbortSignal.timeout(30000)});const html=await response.text();const title=html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]||'';
 const plain=html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,' ').replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/\s+/g,' ').trim();
 const index=plain.search(/service\s+fees|fees\s+and\s+payment|الرسوم/i);
 results.push({name,url,finalUrl:response.url,status:response.status,title,feeExcerpt:index>=0?plain.slice(Math.max(0,index-100),index+1000):null,state:response.ok?'SOURCE_CAPTURED_REQUIRES_REVIEW':'ACCESS_FAILED',scope:'No fee fact is accepted from HTTP status alone.'});
 }catch(error){results.push({name,url,state:'CAPTURE_FAILED',error:String(error)});}
}
const report={at:new Date().toISOString(),results};await writeFile(out+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
