import {readFile,writeFile,readdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {pathwayMarkup,officialVariantMarkup} from '../../service-pathways.js';
import {escapeHtml as esc,emirateEnglish} from './english-catalog.mjs';
const root=resolve(import.meta.dirname,'../..');
const {services}=JSON.parse(await readFile(join(root,'src/registry/published-services.json'),'utf8'));
const version=createHash('sha256').update(await readFile(join(root,'service-pathways.js'))).update(await readFile(join(root,'service-pathways.css'))).update(await readFile(join(root,'customer-execution-data.json'))).digest('hex').slice(0,12);
const routes=new Map(services.flatMap(s=>[['.'+s.internalRoute,s],['./en'+s.internalRoute,s]]));
const emirates=['دبي','أبوظبي','الشارقة','عجمان','رأس الخيمة','الفجيرة','أم القيوين'];
const featured=['family-residency-uae','issue-trade-license-dubai','transfer-work-permit-uae','renew-business-license-sharjah','ajman-commercial-license-issuance','abu-dhabi-economic-license-issuance'].map(slug=>services.find(s=>s.slug===slug));
if(featured.some(s=>!s))throw Error('Canonical homepage transaction missing');
for(const locale of ['ar','en']){
 const en=locale==='en',p=en?'/en':'',file=join(root,en?'en/index.html':'index.html');let html=await readFile(file,'utf8');
 const emirateMarkup=`<section class="premium-emirates content-section compact-emirates" data-hb-emirates><h2>${en?'Choose your emirate':'اختر الإمارة'}</h2><div class="hb-emirate-grid">${emirates.map(e=>`<a href="${p}/discover/?emirate=${encodeURIComponent(e)}">${en?emirateEnglish(e):e}</a>`).join('')}</div></section>`;
 html=html.replace(/<section\b[^>]*class="premium-emirates[^>]*>[\s\S]*?<\/section>/g,'');
 html=html.replace(/<section\b[^>]*data-hb-capabilities[^>]*>[\s\S]*?<\/section>/g,'');
 const cards=featured.map(s=>`<article><h3><a href="${p+s.internalRoute}">${esc(s.name[locale])}</a></h3><p>${esc(s.authority[locale])} · ${esc(en?emirateEnglish(s.emirate):s.emirate)}</p>${pathwayMarkup({...s,emirate_en:emirateEnglish(s.emirate)},locale)}</article>`).join('');
 const section=`<section class="hb-capability-showcase" data-hb-capabilities><h2>${en?'Choose your transaction and how to proceed':'اختر معاملتك وطريقة إنجازها'}</h2><p>${en?'Use the government channel directly or ask HOSSAM BAHR for assistance. Requirements and decisions remain with the responsible authority.':'استخدم القناة الحكومية مباشرة أو اطلب مساعدة حسام بحر. الشروط والقرارات لدى الجهة المختصة.'}</p><nav class="discovery-groups" aria-label="${en?'Explore platform areas':'اكتشف مجالات المنصة'}"><a href="${p}/approvals/">${en?'Government approvals and permits':'الموافقات الحكومية والتصاريح'}</a><a href="${p}/business-activities/">${en?'Economic and business activities':'الأنشطة الاقتصادية والتجارية'}</a><a href="${p}/discover/">${en?'Complete service directory':'دليل الخدمات الكامل'}</a></nav><div class="hb-featured-transactions">${cards}</div></section>`;
 if(html.includes('</main>'))html=html.replace('</main>',emirateMarkup+section+'</main>');
 else if(html.includes('<footer'))html=html.replace('<footer',emirateMarkup+section+'<footer');
 else throw Error('Homepage insertion anchor missing: '+locale);
 await writeFile(file,html);
}
const excluded=new Set(['.git','node_modules','src','supabase','test','tests','artifacts','reports','outputs','work','diagnostics','.github','account','os','owner','dashboard','auth']);
async function walk(dir){for(const entry of await readdir(dir,{withFileTypes:true})){
 if(entry.isDirectory()){if(!excluded.has(entry.name)&&!entry.name.startsWith('.'))await walk(join(dir,entry.name));continue;}
 if(entry.name!=='index.html')continue;
 const file=join(dir,entry.name);let html=await readFile(file,'utf8');if(!html.includes('<main'))continue;
 const locale=/<html\b[^>]*lang="en"/.test(html)?'en':'ar';
 const relative='.'+dir.slice(root.length).replaceAll('\\','/')+'/';const service=routes.get(relative);
 if(service){
  if(service.officialVariantCards?.length>1){
   html=html.replace(/<section\b[^>]*data-hb-official-variants[^>]*>[\s\S]*?<\/section>/g,'');
   html=html.replaceAll('فئة محددة داخل خدمة أم','بطاقات رسمية بحسب المدة').replaceAll('إصدار تأشيرة لاستكشاف فرص العمل عبر ICP مع اختيار الفئة داخل المعاملة.','إصدار تأشيرة لاستكشاف فرص العمل عبر ICP؛ اختر المدة وراجع بطاقتها الرسمية.');
   const variantBlock=officialVariantMarkup(service,locale);
   const insertion=locale==='en'?'<section id="service-documents">':'<section id="official-route"';
   if(!html.includes(insertion))throw Error('Missing official variant placement: '+service.slug);
   html=html.replace(insertion,variantBlock+insertion);
   html=html.replace(/<p class="verification-note">[\s\S]*?<\/p>/g,'<p class="verification-note">'+(locale==='en'?'Choose the visa duration below and review its specific ICP information card. Requirements can differ by duration.':'اختر مدة التأشيرة أدناه وراجع بطاقة ICP الخاصة بها. قد تختلف المتطلبات حسب المدة.')+'</p>');
   const chooser=(locale==='en'?'/en':'')+service.internalRoute+'#official-variant-options';
   html=html.replace(/<a\b[^>]*>[\s\S]*?<\/a>/g,link=>{
    const parent=link.includes(service.officialCtaUrl.replaceAll('&','&amp;'))||link.includes(service.officialCtaUrl);
    if(!parent)return link;
    if(link.includes('primary-government-cta')||/Open the government service|بطاقة المعلومات الرسمية/.test(link))return link.replace(/href="[^"]*"/,'href="'+chooser+'"').replace(/\s+target="_blank"/,'').replace('data-government-cta="verified"','data-government-duration-selection').replace(/>[^<]*<\/a>$/, '>'+(locale==='en'?'Choose visa duration →':'اختر مدة التأشيرة ←')+'</a>');
    if(link.includes('official-card-reference'))return link.replace(/>[^<]*<\/a>$/,'>مرجع التأشيرات العام لدى ICP ↗</a>');
    if(/Read the official source/.test(link))return link.replace('Read the official source','Read the general visa source');
    return link;
   });
  }

  // Existing Arabic pages survive builds, so always refresh their canonical pathway block.
  html=html.replace(/<div\b[^>]*data-hb-pathways="[^"]*"[^>]*>[\s\S]*?<\/div>/g,'');
  html=html.replace(/(<h1\b[^>]*>[\s\S]*?<\/h1>)/,'$1'+pathwayMarkup(service,locale).replace('<div class=', '<div id="service-execution-options" class='));
 }
 html=html.replace(/<link\b[^>]*href="\/service-pathways\.css[^>]*>/g,'').replace(/<script\b[^>]*src="\/service-pathways\.js[^>]*><\/script>/g,'');
 html=html.replace('</head>',`<link rel="stylesheet" href="/service-pathways.css?v=${version}"><script type="module" src="/service-pathways.js?v=${version}"></script></head>`);
 await writeFile(file,html);
}}
await walk(root);
console.log(JSON.stringify({servicePathways:services.length,locales:2,whatsapp:'canonical-context-only'}));

