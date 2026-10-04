import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {customerContext,executionHref,executionPage} from './customer-execution.mjs';
import {englishServiceRoute} from './english-catalog.mjs';
const root=resolve(import.meta.dirname,'../..');
const {services}=JSON.parse(await readFile(join(root,'src/registry/published-services.json'),'utf8'));
const runtimeVersion=createHash('sha256').update(await readFile(join(root,'customer-intake.js'))).update(await readFile(join(root,'customer-jurisdiction.js'))).digest('hex').slice(0,12);
await writeFile(join(root,'customer-execution-data.json'),JSON.stringify(services.map(customerContext)));
for(const locale of ['ar','en'])for(const pricing of [false,true]){
 const dir=join(root,locale==='en'?'en':'',pricing?'pricing':'contact');await mkdir(dir,{recursive:true});await writeFile(join(dir,'index.html'),executionPage(locale,pricing).replace('src="/customer-intake.js"','src="/customer-intake.js?v='+runtimeVersion+'"'));
}
// Run after service and English generators: this owns the assisted CTA in both locales.
for(const service of services)for(const locale of ['ar','en']){
 const path=join(root,'.'+(locale==='en'?englishServiceRoute(service):service.internalRoute),'index.html');
 let html=await readFile(path,'utf8'),href=executionHref(service,locale);
 if(locale==='ar')html=html.replace(/(<a\b[^>]*class="execute-with-us-cta"[^>]*href=")[^"]*("[^>]*>)/g,'$1'+href.replaceAll('&','&amp;')+'$2').replace(/(<a\b[^>]*class="execute-with-us-cta"[^>]*?)\s+target="_blank"/g,'$1');
 else if(!html.includes('data-customer-execution'))html=html.replace('</main>',`<section data-customer-execution><h2>Ask Hossam Bahr to handle it</h2><p>Get help with preparation, execution and follow-up within an agreed scope. Review your service and authority before continuing.</p><a href="${href.replaceAll('&','&amp;')}">Review my transaction request →</a></section></main>`);
 await writeFile(path,html);
}
// Replace directory-only positioning in published customer pages without changing government facts.
async function positioning(dir){for(const item of await readdir(dir,{withFileTypes:true})){
 if(['.git','node_modules','artifacts','reports','diagnostics','test','supabase','src','_next'].includes(item.name))continue;
 const file=join(dir,item.name);if(item.isDirectory())await positioning(file);else if(item.name.endsWith('.html')){
  let html=await readFile(file,'utf8');const before=html;
  html=html.replaceAll('دليل إماراتي مستقل يساعدك على فهم المعاملة والوصول إلى القناة الحكومية الرسمية الصحيحة.','خدمة مستقلة تساعدك في فهم وتجهيز وإنجاز ومتابعة معاملتك، مع خيار التنفيذ عبر القناة الحكومية الرسمية.')
   .replaceAll('دليل مستقل يوجّهك إلى القنوات الحكومية الرسمية.','خدمة مستقلة لتجهيز وإنجاز ومتابعة المعاملات، مع إتاحة المسار الحكومي الرسمي.')
   .replaceAll('منصة مستقلة لإرشادك إلى خدمات الإمارات','منصة مستقلة لتجهيز وإنجاز ومتابعة معاملات الإمارات');
  html=html.replace(/<a\b[^>]*>[\s\S]*?<\/a>/g,anchor=>{
   if(!/(?:data-commercial-cta|service-assist-action)/.test(anchor)||!anchor.includes('https://wa.me/'))return anchor;
   const encoded=anchor.match(/href="https:\/\/wa\.me\/[^"?]+\?text=([^"]*)"/)?.[1];let message='';try{message=decodeURIComponent(encoded||'');}catch{}
   const matched=services.find(s=>message.includes('https://hossambahr.com'+s.internalRoute));
   const en=html.includes('lang="en"');const href=matched?executionHref(matched,en?'en':'ar'):(en?'/en/contact/':'/contact/');
   return anchor.replace(/href="[^"]*"/,'href="'+href.replaceAll('&','&amp;')+'"').replace(/\s+target="_blank"/,'');
  });
  if(html!==before)await writeFile(file,html);
 }
}}await positioning(root);
console.log(JSON.stringify({customerExecutionServices:services.length,locales:['ar','en'],pricing:'SCOPE_QUOTATION_NOT_INVENTED'}));
