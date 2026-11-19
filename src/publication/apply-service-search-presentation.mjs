import {readFile,writeFile,mkdir} from 'node:fs/promises';import {resolve,join} from 'node:path';import {createHash} from 'node:crypto';
import {canonicalSocialCatalog,normalizedSocialRoute} from './service-social-catalog.mjs';
import {serviceSearchPresentation,searchOrigin} from '../search/service-search-presentation.mjs';
const root=resolve(import.meta.dirname,'../..'),{services,publishedRecords,aliases}=await canonicalSocialCatalog(root),hash=s=>createHash('sha256').update(s).digest('hex');
const decode=s=>String(s??'').replaceAll('&amp;','&').replaceAll('&quot;','"').replaceAll('&#39;',"'").replaceAll('&#x27;',"'").replaceAll('&lt;','<').replaceAll('&gt;','>');
const escape=s=>String(s??'').replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const plain=s=>decode(String(s??'').replace(/<[^>]*>/g,' ')).replace(/\s+/g,' ').trim();
const attrs=t=>Object.fromEntries([...t.matchAll(/([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)].map(m=>[m[1].toLowerCase(),decode(m[2]??m[3])]));
const meta=(html,key)=>[...html.matchAll(/<meta\b[^>]*>/gi)].map(m=>attrs(m[0])).find(a=>a.name?.toLowerCase()===key)?.content;
const report={source:'EXISTING_APPROVED_REGISTRY',researchDate:'2026-11-19',measurementStatus:'GSC_SUBSCRIPTION_REQUIRED; DIRECT_GOOGLE_BROWSER_UNAVAILABLE',searchVolumesReported:false,rankingsReported:false,canonicalServices:services.length,publishedRecordIds:publishedRecords.map(s=>s.id),aliases,pages:[]};
for(const service of services)for(const locale of ['ar','en']){
 const route=(locale==='en'?'/en':'')+service.internalRoute,file=join(root,normalizedSocialRoute(route).slice(1),'index.html');
 let html=await readFile(file,'utf8');const originalBody=html.slice(html.indexOf('</head>')+7),current={title:plain(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]),description:meta(html,'description')},next=serviceSearchPresentation(service,locale,current);
 html=html.replace(/<title[^>]*>[\s\S]*?<\/title>/i,'<title>'+escape(next.title)+'</title>');
 html=html.replace(/<meta\b[^>]*>/gi,t=>attrs(t).name?.toLowerCase()==='description'?'':t).replace('</head>','<meta name="description" content="'+escape(next.description)+'"></head>');
 html=html.replace(/<script\b[^>]*data-service-search-breadcrumb[^>]*>[\s\S]*?<\/script>/gi,'');
 const nav=html.match(/<nav\b(?=[^>]*(?:class=["'][^"']*breadcrumbs|aria-label=["']Breadcrumb))[^>]*>([\s\S]*?)<\/nav>/i)?.[1];
 const trail=[];if(nav){for(const m of nav.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)){const u=new URL(decode(m[1]),searchOrigin),label=plain(m[2]);if(u.origin===searchOrigin&&label&&!trail.some(t=>t.item===u.href))trail.push({name:label,item:u.href});}}
 const canonical=new URL(route,searchOrigin).href,h1=plain(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]);
 if(trail.length&&!trail.some(t=>t.item===canonical))trail.push({name:h1,item:canonical});
 let breadcrumbAdded=false;if(trail.length>=2&&!/"@type"\s*:\s*"BreadcrumbList"/.test(html)){const data={'@context':'https://schema.org','@type':'BreadcrumbList','@id':canonical+'#breadcrumb',itemListElement:trail.map((t,i)=>({'@type':'ListItem',position:i+1,...t}))};html=html.replace('</head>','<script type="application/ld+json" data-service-search-breadcrumb>'+JSON.stringify(data).replaceAll('<','\\u003c')+'</script></head>');breadcrumbAdded=true;}
 if(html.slice(html.indexOf('</head>')+7)!==originalBody)throw Error('Search publication changed visible content or actions: '+route);
 await writeFile(file,html);report.pages.push({id:service.id,locale,route,...next,breadcrumbAdded,breadcrumb:trail,bodySha256:hash(originalBody),bodyPreserved:true,titleChanged:current.title!==next.title,descriptionChanged:current.description!==next.description});
}
const byRoute=new Map(services.map(s=>[normalizedSocialRoute(s.internalRoute),s]));
const queryPlan=publishedRecords.map(s=>{const alias=aliases.find(a=>a.slug===s.slug),owner=alias?byRoute.get(normalizedSocialRoute(alias.target)):s;if(!owner)throw Error('Canonical query owner missing: '+s.id);const ar=report.pages.find(p=>p.id===owner.id&&p.locale==='ar'),en=report.pages.find(p=>p.id===owner.id&&p.locale==='en');return {sourceRecordId:s.id,sourceName:s.name,canonicalOwnerId:owner.id,canonicalRoute:owner.internalRoute,emirate:owner.emirate,authority:owner.authority,ar:{primary:ar.primaryQuery,questions:ar.analystQueryCandidates},en:{primary:en.primaryQuery,questions:en.analystQueryCandidates},evidence:'ANALYST_DERIVED_CANDIDATES_NOT_GSC_OR_GOOGLE_VOLUME',searchVolume:null,googlePosition:null};});
const folder=join(root,'artifacts/service-search-presentation');await mkdir(folder,{recursive:true});
await writeFile(join(folder,'pages.json'),JSON.stringify(report.pages,null,2)+'\n');await writeFile(join(folder,'query-plan.json'),JSON.stringify(queryPlan,null,2)+'\n');
const summary={...report,pages:undefined,optimizedCanonicalPages:report.pages.length,titleChanges:report.pages.filter(p=>p.titleChanged).length,descriptionChanges:report.pages.filter(p=>p.descriptionChanged).length,queryPlanRecords:queryPlan.length,visibleBodyAndActionsPreserved:report.pages.every(p=>p.bodyPreserved)};
await writeFile(join(folder,'report.json'),JSON.stringify(summary,null,2)+'\n');
const csvRow=values=>values.map(v=>'"'+String(v??'').replaceAll('"','""')+'"').join(',');
await writeFile(join(folder,'query-plan.csv'),'\ufeff'+[csvRow(['source_record_id','canonical_owner_id','canonical_url_ar','canonical_url_en','scope','authority_ar','candidate_query_ar','candidate_query_en','evidence','search_volume','google_position']),...queryPlan.map(q=>csvRow([q.sourceRecordId,q.canonicalOwnerId,new URL(q.canonicalRoute,searchOrigin).href,new URL('/en'+q.canonicalRoute,searchOrigin).href,q.emirate,q.authority.ar,q.ar.primary,q.en.primary,q.evidence,'','']))].join('\n')+'\n');
console.log(JSON.stringify({searchPresentation:'APPLIED',records:publishedRecords.length,canonicalServices:services.length,pages:report.pages.length,titleChanges:report.pages.filter(p=>p.titleChanged).length,descriptionChanges:report.pages.filter(p=>p.descriptionChanged).length,bodyAndActionsPreserved:true,searchDemandMeasured:false}));
