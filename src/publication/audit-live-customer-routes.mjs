import {readFile,readdir,mkdir,writeFile} from 'node:fs/promises';
import {resolve,join,relative} from 'node:path';
import {createServer} from 'node:http';
import {createHash} from 'node:crypto';
import {rankServices} from '../../intent-search.js';
import {englishServiceRoute,emirateEnglish} from './english-catalog.mjs';
import {executionHref,customerContext} from './customer-execution.mjs';
import {auditCustomerService,summarizeCustomerAudit} from './customer-catalog-audit.mjs';
const root=resolve(import.meta.dirname,'../..');let base=(process.env.HB_BASE_URL||'https://hossambahr.com').replace(/\/$/,'');
let localServer;
if(process.env.HB_AUDIT_LOCAL==='1'){localServer=createServer(async(req,res)=>{try{let route=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(route.endsWith('/'))route+='index.html';const file=resolve(root,'.'+route);if(relative(root,file).startsWith('..'))throw Error('Outside site');res.setHeader('Content-Type',file.endsWith('.html')?'text/html; charset=utf-8':file.endsWith('.json')?'application/json':'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404).end();}});await new Promise(r=>localServer.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+localServer.address().port;}
try{
const output=resolve(process.env.HB_OUTPUT_DIR||join(root,'artifacts/production-reference'));
const excluded=new Set(['.git','node_modules','artifacts','reports','diagnostics','outputs','work','visual-layout-audit','final-platform-acceptance','production-browser','test','src','supabase','_next']);
const files=[];async function scan(dir){for(const e of await readdir(dir,{withFileTypes:true})){if(excluded.has(e.name))continue;const p=join(dir,e.name);if(e.isDirectory())await scan(p);else if(e.name.endsWith('.html'))files.push(p);}}await scan(root);
const decode=v=>String(v||'').replace(/&(?:amp|quot|apos|lt|gt|#39|#(\d+)|#x([\da-f]+));/gi,(s,n,h)=>n?String.fromCodePoint(Number(n)):h?String.fromCodePoint(parseInt(h,16)):({'&amp;':'&','&quot;':'"','&apos;':"'",'&lt;':'<','&gt;':'>','&#39;':"'"}[s]||s));
const canonical=html=>decode(html.match(/<link\b(?=[^>]*\brel=["']canonical["'])[^>]*\bhref=["']([^"']+)/i)?.[1]);
const lang=html=>html.match(/<html\b[^>]*\blang=["']([^"']+)/i)?.[1];
const text=v=>decode(v.replace(/<[^>]+>/g,' ')).normalize('NFKC').replace(/\s+/g,' ').trim();
const heading=html=>text(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1]||'');
const hrefs=html=>[...html.matchAll(/<a\b[^>]*\bhref=["']([^"']*)/gi)].map(m=>decode(m[1]));
const routeFor=file=>'/'+relative(root,file).replaceAll('\\','/').replace(/(?:^|\/)index\.html$/,m=>m==='index.html'?'':'/');
const pages=new Map();for(const f of files){const route=routeFor(f).replaceAll('//','/');pages.set(new URL(route,base).pathname,{file:f,html:await readFile(f,'utf8')});}
const targets=new Map([...pages].map(([route])=>[route,{referrers:[]}]));
let internalReferences=0;for(const [route,p] of pages)for(const href of hrefs(p.html)){if(!href||href.startsWith('#'))continue;let url;try{url=new URL(href,base+route);}catch{continue;}if(url.origin!==new URL(base).origin)continue;internalReferences++;const key=url.pathname;if(!targets.has(key))targets.set(key,{referrers:[]});targets.get(key).referrers.push({page:route,href});}
const results=[],bodies=new Map();let cursor=0;const entries=[...targets];const release=process.env.HB_DEPLOYED_SHA||process.env.GITHUB_SHA||'live-audit';
const hash=html=>createHash('sha256').update(html.replace(/آخر تحديث تلقائي:\s*[^<]+/g,'آخر تحديث تلقائي: [BUILD_TIMESTAMP]')).digest('hex');
async function worker(){while(cursor<entries.length){const [route,target]=entries[cursor++];const failures=[];let response,body='',error;
for(let attempt=0;attempt<3;attempt++){try{const url=new URL(route,base);url.searchParams.set('hb_live_audit',release);response=await fetch(url,{redirect:'follow',signal:AbortSignal.timeout(30000),headers:{'cache-control':'no-cache'}});body=await response.text();error=null;if(response.status===200)break;}catch(e){error=e.name;}if(attempt<2)await new Promise(r=>setTimeout(r,2000));}
if(error)failures.push('HTTP transport: '+error);else if(response?.status!==200)failures.push('HTTP '+response?.status);
const local=pages.get(route),is404=['/404.html','/404/','/_not-found/'].includes(route);
if(response?.status===200&&response.headers.get('content-type')?.includes('text/html')&&!is404){if(/^(?:404|page not found|لم يتم العثور|الصفحة غير موجودة)/i.test(heading(body)))failures.push('Soft 404 heading');if(!pages.has(new URL(response.url).pathname))failures.push('Final HTML target is not in the published inventory');}
if(local&&response?.status===200){if(hash(body)!==hash(local.html)&&!is404)failures.push('Live page bytes differ from the materialized source');
const c=canonical(body),expected=canonical(local.html);if(!is404&&!c)failures.push('Canonical missing');if(c!==expected)failures.push('Canonical differs from source');
if(route.startsWith('/en/')&&lang(body)!=='en')failures.push('English route has wrong document language');
if(!is404&&/^(?:404|page not found|لم يتم العثور|الصفحة غير موجودة)/i.test(heading(body)))failures.push('Soft 404 heading');
bodies.set(route,body);}
results.push({route,status:response?.status||null,finalUrl:response?.url||null,canonical:local?canonical(body):null,lang:local?lang(body):null,failures,referrers:target.referrers});}}
await Promise.all(Array.from({length:8},worker));
const services=JSON.parse(await readFile(join(root,'src/registry/published-services.json'),'utf8')).services,serviceResults=[],records=[];
let intakeCatalog;try{const r=await fetch(base+'/customer-execution-data.json?hb_live_audit='+release,{signal:AbortSignal.timeout(30000)});if(r.status!==200)throw Error('Intake catalog HTTP '+r.status);intakeCatalog=await r.json();}catch(e){intakeCatalog=null;}
const contextRows=Array.isArray(intakeCatalog)?intakeCatalog:intakeCatalog?.services||[];
const discoveryAssets=[];for(const file of ['intent-search.js','intent-search-data.js','english-catalog-data.json']){try{const r=await fetch(base+'/'+file+'?hb_live_audit='+release,{signal:AbortSignal.timeout(30000)});const body=await r.text();const source=await readFile(join(root,file),'utf8');discoveryAssets.push({file,status:r.status,bytesMatch:r.status===200&&hash(body)===hash(source),body});}catch(e){discoveryAssets.push({file,status:null,bytesMatch:false,body:''});}}
let shared=[],english=[];if(discoveryAssets.every(a=>a.bytesMatch)){const source=discoveryAssets.find(a=>a.file==='intent-search-data.js').body;shared=JSON.parse(source.slice(source.indexOf('=')+1).replace(/;\s*$/,''));english=JSON.parse(discoveryAssets.find(a=>a.file==='english-catalog-data.json').body);}
for(const service of services){const ar=new URL(service.internalRoute,base).pathname,en=new URL(englishServiceRoute(service),base).pathname;const failures=[],arHtml=bodies.get(ar)||'',enHtml=bodies.get(en)||'';
for(const [route,html,name,locale] of [[ar,arHtml,service.name.ar,'ar'],[en,enHtml,service.name.en,'en']]){
if(heading(html)!==text(name))failures.push(locale+' service identity mismatch');
const links=hrefs(html);if(!links.includes(service.officialInformationUrl))failures.push(locale+' official source link missing');if(!links.includes(service.officialCtaUrl))failures.push(locale+' government CTA missing');if(!links.includes(executionHref(service,locale)))failures.push(locale+' scoped Hossam CTA missing');
}
const context=contextRows.find(row=>row.service_slug===service.slug),expected=customerContext(service);const contextPresent=context&&JSON.stringify(context)===JSON.stringify(expected);
if(!contextPresent)failures.push('Public intake context differs from registry');
const arResult=results.find(r=>r.route===ar),enResult=results.find(r=>r.route===en);
const searchHits={ar:rankServices(service.name.ar+' '+service.emirate,shared)[0]?.s,en:rankServices(service.name.en+' '+emirateEnglish(service.emirate),english)[0]?.s};const searchCorrect=searchHits.ar===service.slug&&searchHits.en===service.slug;if(!searchCorrect)failures.push('Published canonical search identity mismatch');
const e={searchMatch:searchHits,searchCorrect,arabicRoute:!!arResult&&!arResult.failures.length,englishRoute:!!enResult&&!enResult.failures.length,canonical:{ar:canonical(arHtml),en:canonical(enHtml)},canonicalVerified:!!arResult&&!arResult.failures.length&&!!enResult&&!enResult.failures.length,redirects:[arResult?.finalUrl,enResult?.finalUrl],hossamCta:executionHref(service),hossamCtaCorrect:hrefs(arHtml).includes(executionHref(service))&&hrefs(enHtml).includes(executionHref(service,'en')),handoffContext:contextPresent?context:null,handoffCorrect:false};
records.push(auditCustomerService(service,e));serviceResults.push({id:service.id,slug:service.slug,ar,en,publicContextCorrect:!!contextPresent,failures});
}
const report={status:discoveryAssets.every(a=>a.bytesMatch)&&results.every(r=>!r.failures.length)&&serviceResults.every(r=>!r.failures.length)?'PASS':'FAIL',deployedCommit:release,base,captureSource:process.env.HB_AUDIT_LOCAL==='1'?'LOCAL_BUILD_HTTP':'LIVE_PRODUCTION_HTTP',discoveryAssets:discoveryAssets.map(({body,...e})=>e),publishedPages:pages.size,uniqueInternalTargets:targets.size,internalReferences,brokenInternalTargets:results.filter(r=>r.failures.length).length,auditedServices:services.length,serviceRoutePairsPassed:serviceResults.filter(r=>!r.failures.length).length,scope:'Public route/source identity, canonical, locale, internal href/referrer and scoped CTA checks. This does not verify external government availability, authenticated execution, documents, eligibility correctness or human visual acceptance.',results,serviceResults};
await mkdir(output,{recursive:true});await writeFile(join(output,'live-customer-routes.json'),JSON.stringify(report,null,2));
await writeFile(join(output,'customer-field-evidence.json'),JSON.stringify({...summarizeCustomerAudit(records),scope:report.scope,records},null,2));
console.log(JSON.stringify({...report,results:report.results.filter(r=>r.failures.length),serviceResults:report.serviceResults.filter(r=>r.failures.length)},null,2));if(report.status!=='PASS')process.exitCode=1;

}finally{localServer?.close();}
