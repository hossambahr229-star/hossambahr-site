import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {HB_IDENTITY,socialPresentation} from '../src/design/brand-system.mjs';
import {renderServiceSocialCard} from '../src/design/service-social-card.mjs';
import {canonicalSocialCatalog,socialDesignSignature,socialRecordFingerprint,socialHash,SOCIAL_ORIGIN,jpegDimensions} from '../src/publication/service-social-catalog.mjs';

const root=resolve(import.meta.dirname,'..'),folder=join(root,'assets/social/services'),manifestPath=join(folder,'manifest.json');
await mkdir(folder,{recursive:true});let previous={records:[]};try{previous=JSON.parse(await readFile(manifestPath,'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
const{services,aliases,excluded}=await canonicalSocialCatalog(root),signature=await socialDesignSignature(root),old=new Map(previous.records.map(r=>[r.id+':'+r.locale,r]));
const manifest={version:1,identityVersion:HB_IDENTITY.version,designSignature:signature,width:1200,height:630,type:'image/jpeg',records:[],aliases,excluded};let browser,page,generated=0,reused=0;
const dataUrl=async(file,mime)=>'data:'+mime+';base64,'+(await readFile(join(root,file))).toString('base64');
const assets={logo:await dataUrl('icon.svg','image/svg+xml'),font600:await dataUrl('assets/fonts/cairo-600.ttf','font/ttf'),font800:await dataUrl('assets/fonts/cairo-800.ttf','font/ttf')};
try{
 for(const service of services)for(const locale of['ar','en']){
  const fingerprint=socialRecordFingerprint(service,locale,signature),existing=old.get(service.id+':'+locale);
  if(existing?.fingerprint===fingerprint){try{const buffer=await readFile(join(root,existing.path));const size=jpegDimensions(buffer);if(size.width===1200&&size.height===630&&socialHash(buffer)===existing.sha256){manifest.records.push(existing);reused++;continue;}}catch(error){if(error.code!=='ENOENT')throw error;}}
  if(!browser){const{chromium}=await import('playwright');browser=await chromium.launch({headless:true,executablePath:process.env.HB_BROWSER_PATH||'/usr/bin/google-chrome'});page=await browser.newPage({viewport:{width:1200,height:630},deviceScaleFactor:1});}
  await page.setContent(renderServiceSocialCard(service,locale,assets),{waitUntil:'load'});await page.evaluate(()=>document.fonts.ready);
  const fit=await page.evaluate(()=>{const h=document.querySelector('h1');let size=parseFloat(getComputedStyle(h).fontSize);while((h.getBoundingClientRect().height>285||h.scrollWidth>h.clientWidth+2)&&size>40){size=Math.max(40,size-2);h.style.fontSize=size+'px';}return{fontSize:size,headingOverflow:h.getBoundingClientRect().height>285||h.scrollWidth>h.clientWidth+2,footerBottom:document.querySelector('.footer').getBoundingClientRect().bottom,fontLoaded:document.fonts.check('800 48px HBCard')};});
  if(fit.headingOverflow||fit.footerBottom>630||!fit.fontLoaded)throw Error('Social card needs editorial fitting: '+service.slug+' '+locale+' '+JSON.stringify(fit));
  const name=socialHash(service.id).slice(0,16)+'-'+locale+'-'+fingerprint.slice(0,12)+'.jpg',relativePath='assets/social/services/'+name;
  const buffer=await page.screenshot({type:'jpeg',quality:HB_IDENTITY.social.jpegQuality});const dimensions=jpegDimensions(buffer);
  if(dimensions.width!==1200||dimensions.height!==630||buffer.length>256000)throw Error('Social asset dimensions or budget failed: '+service.slug);
  await writeFile(join(root,relativePath),buffer);const p=socialPresentation(service);
  manifest.records.push({id:service.id,slug:service.slug,canonicalRoute:(locale==='en'?'/en':'')+service.internalRoute,locale,title:service.name[locale],family:p.key,layout:p.layout,intent:p.intent,variant:p.variant,guidance:p.guidance,fingerprint,path:relativePath,imageUrl:SOCIAL_ORIGIN+'/'+relativePath,type:'image/jpeg',width:1200,height:630,bytes:buffer.length,sha256:socialHash(buffer),fontSize:fit.fontSize});generated++;
 }
}finally{await browser?.close();}
await writeFile(manifestPath,JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({socialAssets:'GENERATED',canonicalServices:services.length,images:manifest.records.length,generated,reused,aliases:aliases.length,excluded:excluded.length,totalBytes:manifest.records.reduce((n,r)=>n+r.bytes,0)}));
