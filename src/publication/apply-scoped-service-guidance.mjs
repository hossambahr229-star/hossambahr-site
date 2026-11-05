import{readFile,writeFile,mkdir}from'node:fs/promises';import{resolve,join}from'node:path';import{createHash}from'node:crypto';import{renderScopedGuidance,scopedGuidanceCSS}from'../design/scoped-service-guidance.mjs';
const root=resolve(import.meta.dirname,'../..'),{services}=JSON.parse(await readFile(join(root,'src/registry/published-services.json'),'utf8')),css=scopedGuidanceCSS(),version=createHash('sha256').update(css).digest('hex').slice(0,12);await writeFile(join(root,'scoped-service-guidance.css'),css);const report={pages:[],stages:[]};
// Guidance sources must not acquire protected transaction CTAs from the global runtime.
for(const service of services.filter(s=>s.destinationKind==='OFFICIAL_GUIDANCE'))for(const locale of['ar','en']){
 const file=join(root,locale==='en'?'en':'',decodeURIComponent(service.internalRoute.slice(1)),'index.html');let html=await readFile(file,'utf8'),count=0;
 html=html.replace(/<main\b([^>]*)>/i,(tag,attrs)=>{count++;return /\bdata-destination-kind=/.test(attrs)?tag.replace(/data-destination-kind=["'][^"']*["']/,'data-destination-kind="OFFICIAL_GUIDANCE"'):'<main'+attrs+' data-destination-kind="OFFICIAL_GUIDANCE">';});if(count!==1)throw Error('Missing guidance main: '+service.slug+' '+locale);await writeFile(file,html);
}
for(const service of services.filter(s=>s.scopedGuidance))for(const locale of['ar','en']){
 if(service.destinationKind!=='OFFICIAL_GUIDANCE')throw Error('A scoped pathway selector must remain guidance: '+service.slug);
 for(const option of service.scopedGuidance.options){const url=new URL(option.informationUrl);if(url.protocol!=='https:'||url.hostname!=='www.dubaidet.gov.ae'||!url.pathname.startsWith('/en/our-services/'))throw Error('Unverified scoped-service card: '+option.key);if(option.applicationUrl){const portal=new URL(option.applicationUrl);if(portal.protocol!=='https:'||!['classification.dubaitourism.ae','hhpermits.det.gov.ae'].includes(portal.hostname))throw Error('Unverified scoped application portal: '+option.key);}}
 const file=join(root,locale==='en'?'en':'',decodeURIComponent(service.internalRoute.slice(1)),'index.html');let html=await readFile(file,'utf8');
 html=html.replace(/<section\b[^>]*id="scoped-service-guidance"[^>]*>[\s\S]*?<\/section>/gi,'').replace(/<link\b[^>]*href=["']\/scoped-service-guidance\.css(?:\?[^"']*)?["'][^>]*>/gi,'');
 html=html.replace(/<main\b([^>]*)>/i,(tag,attrs)=>/\bdata-destination-kind=/.test(attrs)?tag.replace(/data-destination-kind=["'][^"']*["']/,'data-destination-kind="OFFICIAL_GUIDANCE"'):'<main'+attrs+' data-destination-kind="OFFICIAL_GUIDANCE">');
 const main=html.indexOf('<main');if(main<0)throw Error('No service main');
 const hero=html.slice(main).match(/<header\b[^>]*class="[^"]*\bpage-hero\b[^"]*"[^>]*>/i);let at=hero?html.indexOf('</header>',main+hero.index)+9:html.indexOf('<section',main);
 if(at<main)at=html.indexOf('</main>',main);if(at<0)throw Error('No scoped panel insertion point');
 html=html.slice(0,at)+renderScopedGuidance(service,locale)+html.slice(at);html=html.replace('</head>','<link rel="stylesheet" href="/scoped-service-guidance.css?v='+version+'"></head>');await writeFile(file,html);report.pages.push({slug:service.slug,locale,parentDetailsVerified:service.verification.detailsVerified,stages:service.scopedGuidance.options.map(o=>o.key)});
}
await mkdir(join(root,'artifacts/scoped-guidance'),{recursive:true});await writeFile(join(root,'artifacts/scoped-guidance/report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({scopedGuidancePages:report.pages.length,parentFactsNotPromoted:true}));
