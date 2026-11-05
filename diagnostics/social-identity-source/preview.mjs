import fs from 'node:fs/promises';import path from 'node:path';import{createRequire}from'node:module';
const site='/tmp/hb-social-preview',out=path.resolve('diagnostics/social-identity-preview-20261105');await fs.mkdir(out,{recursive:true});
const require=createRequire(site+'/package.json'),{chromium}=require('playwright');const{socialPresentation}=await import(site+'/src/design/brand-system.mjs');const{renderServiceSocialCard}=await import(site+'/src/design/service-social-card.mjs');
const data=JSON.parse(await fs.readFile(site+'/src/registry/published-services.json','utf8'));
const asData=async(file,mime)=>'data:'+mime+';base64,'+(await fs.readFile(site+'/'+file)).toString('base64');
const assets={logo:await asData('icon.svg','image/svg+xml'),font600:await asData('assets/fonts/cairo-600.ttf','font/ttf'),font800:await asData('assets/fonts/cairo-800.ttf','font/ttf')};
const keys=['business','renewal','closure','golden','investor','family','employment','establishment','approvals','certificates','visas'],browser=await chromium.launch({headless:true,executablePath:'/usr/bin/google-chrome'}),report={status:'PREVIEW_ONLY',source:'CODE_NATIVE_ORIGINAL_SERVICE_ART_AND_LAYOUTS',width:1200,height:630,published:false,examples:[],errors:[]};
try{
 const page=await browser.newPage({viewport:{width:1200,height:630},deviceScaleFactor:1});
 for(const key of keys){const service=data.services.find(s=>socialPresentation(s).key===key&&s.slug!=='renew-business-license-ajman');if(!service){report.errors.push({key,error:'No actual published representative found'});continue;}
 for(const locale of['ar','en']){await page.setContent(renderServiceSocialCard(service,locale,assets),{waitUntil:'load'});await page.evaluate(()=>document.fonts.ready);
 const fit=await page.evaluate(()=>{const h=document.querySelector('h1');let size=parseFloat(getComputedStyle(h).fontSize);while((h.scrollHeight>h.clientHeight+1||h.scrollWidth>h.clientWidth+1)&&size>38){size-=2;h.style.fontSize=size+'px';}const r=h.getBoundingClientRect(),footer=document.querySelector('.footer').getBoundingClientRect();return{fontSize:size,title:h.innerText,headingOverflow:h.scrollHeight>h.clientHeight+1||h.scrollWidth>h.clientWidth+1,footerBottom:footer.bottom,documentOverflow:document.documentElement.scrollWidth>1200||document.documentElement.scrollHeight>630,fontLoaded:document.fonts.check('800 48px HBCard')};});
 const file=key+'-'+locale+'.jpg';await page.screenshot({path:out+'/'+file,type:'jpeg',quality:90});const stat=await fs.stat(out+'/'+file);report.examples.push({key,locale,slug:service.slug,title:service.name[locale],layout:socialPresentation(service).layout,file,bytes:stat.size,...fit});if(fit.headingOverflow||fit.footerBottom>630||fit.documentOverflow||!fit.fontLoaded)report.errors.push({key,locale,error:'Typography or canvas acceptance failed',...fit});
 }}
 await page.close();
}catch(e){report.errors.push({error:String(e.stack||e)});}finally{await browser.close();await fs.writeFile(out+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));}if(report.errors.length)process.exitCode=1;
