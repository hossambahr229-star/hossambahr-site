import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {canonicalSocialCatalog,SOCIAL_ORIGIN,normalizedSocialRoute} from './service-social-catalog.mjs';
import {socialPresentation} from '../design/brand-system.mjs';
import {emirateEnglish} from './english-catalog.mjs';
const root=resolve(import.meta.dirname,'../..'),manifest=JSON.parse(await readFile(join(root,'assets/social/services/manifest.json'),'utf8'));
const byRoute=new Map(manifest.records.map(r=>[new URL(r.canonicalRoute,SOCIAL_ORIGIN).href,r]));
const attrs=tag=>Object.fromEntries([...tag.matchAll(/([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)].map(m=>[m[1].toLowerCase(),(m[2]??m[3]??m[4]).replaceAll('&amp;','&')]));
const canonical=html=>[...html.matchAll(/<link\b[^>]*>/gi)].map(m=>attrs(m[0])).find(a=>a.rel?.toLowerCase()==='canonical')?.href;
const escape=v=>String(v??'').replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const{publishedRecords,services}=await canonicalSocialCatalog(root),byId=new Map(services.map(s=>[s.id,s]));const report={staticSocialMetadata:'APPLIED',pages:[],missing:[]};
for(const published of publishedRecords)for(const locale of['ar','en']){
 const route=(locale==='en'?'/en':'')+published.internalRoute,file=join(root,normalizedSocialRoute(route).slice(1),'index.html');
 let html=await readFile(file,'utf8');const url=new URL(canonical(html)||route,SOCIAL_ORIGIN).href,record=byRoute.get(url);
 if(!record){report.missing.push({route,canonical:url});continue;}
 const service=byId.get(record.id);if(!service)throw Error('Social image has no canonical service: '+record.id);
 const p=socialPresentation(service),title=service.name[locale],scope=locale==='en'?emirateEnglish(service.emirate):service.emirate;
 const description=locale==='en'?title+'. Check verified requirements and the official source, then choose government self-service or HOSSAM BAHR assistance.':title+'. راجع ما هو موثق من الشروط والمستندات والمصدر الرسمي، ثم اختر الإنجاز الحكومي أو المساعدة عبر حسام بحر.';
 const alt=locale==='en'?'HOSSAM BAHR service card for '+title+', with '+p.label.en+' artwork and the jurisdiction '+scope+'.':'بطاقة HOSSAM BAHR لخدمة '+title+'، مع رسم '+p.label.ar+' ونطاق الخدمة '+scope+'.';
 const properties={'og:title':title,'og:description':description,'og:type':'website','og:url':url,'og:site_name':'HOSSAM BAHR','og:locale':locale==='en'?'en_AE':'ar_AE','og:image':record.imageUrl,'og:image:secure_url':record.imageUrl,'og:image:type':'image/jpeg','og:image:width':'1200','og:image:height':'630','og:image:alt':alt};
 const twitter={'twitter:card':'summary_large_image','twitter:title':title,'twitter:description':description,'twitter:image':record.imageUrl,'twitter:image:alt':alt};
 html=html.replace(/<meta\b[^>]*>/gi,tag=>{const a=attrs(tag),key=(a.property||a.name||'').toLowerCase();return key.startsWith('og:')||key.startsWith('twitter:')?'':tag;});
 const tags=Object.entries(properties).map(([key,value])=>'<meta property="'+key+'" content="'+escape(value)+'">').join('')+Object.entries(twitter).map(([key,value])=>'<meta name="'+key+'" content="'+escape(value)+'">').join('');
 html=html.replace('</head>',tags+'</head>');await writeFile(file,html);report.pages.push({route,locale,canonical:url,image:record.imageUrl});
}
await mkdir(join(root,'artifacts/service-social'),{recursive:true});await writeFile(join(root,'artifacts/service-social/publication.json'),JSON.stringify(report,null,2)+'\n');
if(report.missing.length)throw Error('Missing canonical social assets for '+report.missing.length+' published pages; run npm run social:generate before the accepted build');
console.log(JSON.stringify({staticServiceSocialPages:report.pages.length,localizedImages:manifest.records.length,clientJavaScriptRequired:false}));
