import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';import {createHash} from 'node:crypto';
import {renderScopedGuidance} from '../design/scoped-service-guidance.mjs';
const root=resolve(import.meta.dirname,'../..'),slug='تأشيرة-استكشاف-فرص-عمل-عبر-icp-خارج-دبي';
const registry=JSON.parse(await readFile(join(root,'src/registry/published-services.json'),'utf8'));
const matrix=JSON.parse(await readFile(join(root,'service-matrix.json'),'utf8'));
const service=registry.services.find(s=>s.slug===slug),source=matrix.services.find(s=>s.slug===slug);
if(!service||!source||service.authority.id!=='icp'||service.verification.detailsVerified)throw Error('Unexpected ICP parent scope');
const approved={60:['68e3509b5ae59b00117383ea',939],90:['68e350ab5ae59b00117383ed',941],120:['68e356135ae59b001173842d',942]};
if(service.officialVariantCards?.length!==3)throw Error('Expected three existing duration cards');
const options=service.officialVariantCards.map(card=>{
 const tuple=approved[card.durationDays],details=service.officialVariantDetails?.[String(card.durationDays)];
 if(!tuple||card.informationUrl!=='https://icp.gov.ae/en/services-details/?serviceid='+tuple[0]||details?.scope!=='PUBLISHED_CARD_CONTENT_NOT_COMPLETE_ELIGIBILITY')throw Error('Unreviewed ICP variant');
 const choice=source.executionChoices.find(c=>c.transactionId===tuple[1]);
 const approvedApplication='https://smartservices.icp.gov.ae/echannels/web/client/guest/index.html#/issueVisa/request/'+tuple[1]+'/step1?administrativeRegionId=1&withException=false';
 if(choice?.url!==approvedApplication)throw Error('Changed ICP application destination');
 return {key:'icp-job-'+card.durationDays,title:{ar:card.durationDays+' يومًا — دخول مرة واحدة',en:card.durationDays+' days — single entry'},...details,informationUrl:card.informationUrl,applicationUrl:choice.url};
});
const guide={heading:{ar:'اختر مدة تأشيرة استكشاف العمل',en:'Choose the job-exploration visa duration'},detailsLabel:{ar:'المستندات والشروط والرسوم',en:'Documents, conditions and fees'},reviewedAt:'2026-11-13',notice:{ar:'هذه البيانات تخص بطاقة كل مدة على حدة؛ لا تُنقل متطلبات أو رسوم مدة إلى أخرى. تؤكد ICP البنود المنطبقة على طلبك، ولا تعني القائمة تأكيد الأهلية الكاملة.',en:'These are the published details of each duration card. Requirements and fee items are not transferred between cards. ICP confirms their applicability to your case; the lists do not establish complete eligibility.'},options};
const css=await readFile(join(root,'scoped-service-guidance.css'),'utf8'),version=createHash('sha256').update(css).digest('hex').slice(0,12);
for(const locale of ['ar','en']){
 const file=join(root,locale==='en'?'en':'',decodeURIComponent(service.internalRoute.slice(1)),'index.html');
 let html=await readFile(file,'utf8');
 html=html.replace(/<!-- hb-icp-variants:start -->[\s\S]*?<!-- hb-icp-variants:end -->/g,'').replace(/<link\b[^>]*data-icp-variant-css[^>]*>/g,'');
 const main=html.indexOf('<main');if(main<0)throw Error('Missing service main');
 const hero=html.slice(main).match(/<header\b[^>]*class="[^"]*\bpage-hero\b[^"]*"[^>]*>/);
 let at=hero?html.indexOf('</header>',main+hero.index)+9:html.indexOf('<section',main);
 if(at<main)throw Error('Missing variant insertion boundary');
 const panel=renderScopedGuidance({...service,scopedGuidance:guide},locale).replaceAll('id="scoped-service-guidance"','id="icp-variant-details"').replaceAll('scoped-guidance-title','icp-variant-details-title');
 html=html.slice(0,at)+'<!-- hb-icp-variants:start -->'+panel+'<!-- hb-icp-variants:end -->'+html.slice(at);
 html=html.replace('</head>','<link data-icp-variant-css rel="stylesheet" href="/scoped-service-guidance.css?v='+version+'"></head>');
 await writeFile(file,html);
}
await mkdir(join(root,'artifacts/icp-variant-details'),{recursive:true});
await writeFile(join(root,'artifacts/icp-variant-details/report.json'),JSON.stringify({slug,variants:options.map(o=>({key:o.key,informationUrl:o.informationUrl,applicationUrl:o.applicationUrl,scope:o.scope})),parentDetailsVerified:service.verification.detailsVerified},null,2)+'\n');
