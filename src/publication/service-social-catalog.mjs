import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {HB_IDENTITY,socialPresentation} from '../design/brand-system.mjs';
import {emirateEnglish} from './english-catalog.mjs';
export const SOCIAL_ORIGIN='https://hossambahr.com';
export const socialHash=value=>createHash('sha256').update(value).digest('hex');
export const normalizedSocialRoute=route=>decodeURIComponent(new URL(route,SOCIAL_ORIGIN).pathname);
export async function socialDesignSignature(root){
 const files=['src/design/brand-system.mjs','src/design/service-social-card.mjs','scripts/generate-service-social-images.mjs','assets/fonts/cairo-600.ttf','assets/fonts/cairo-800.ttf','icon.svg'];
 const hash=createHash('sha256');for(const file of files)hash.update(file).update(await readFile(join(root,file)));return hash.digest('hex');
}
export function socialRecordFingerprint(service,locale,signature){
 const p=socialPresentation(service);
 return socialHash(JSON.stringify({signature,identity:HB_IDENTITY.version,id:service.id,locale,title:service.name[locale],scope:locale==='en'?emirateEnglish(service.emirate):service.emirate,authority:service.authority?.[locale],family:p.key,intent:p.intent,variant:p.variant,guidance:p.guidance}));
}
export async function canonicalSocialCatalog(root){
 const{services}=JSON.parse(await readFile(join(root,'src/registry/published-services.json'),'utf8'));
 const canonical=[],aliases=[],excluded=[];
 for(const service of services){
  if(service.verificationStatus!=='VERIFIED'||service.businessAcceptanceStatus!=='APPROVED'){excluded.push({slug:service.slug,reason:'Not an active approved publication'});continue;}
  const route=normalizedSocialRoute(service.internalRoute);let html='';
  try{html=await readFile(join(root,route.slice(1),'index.html'),'utf8');}catch(error){if(error.code!=='ENOENT')throw error;}
  if(/data-safe-legacy-redirect|http-equiv=["']refresh["']/i.test(html)||/<meta\b[^>]*name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html)){excluded.push({slug:service.slug,reason:'Redirect or noindex publication'});continue;}
  const href=html.match(/<link\b[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i)?.[1];
  if(href){const url=new URL(href.replaceAll('&amp;','&'),SOCIAL_ORIGIN);if(url.origin!==SOCIAL_ORIGIN)throw Error('Foreign canonical service: '+service.slug);
   if(normalizedSocialRoute(url.href)!==route){aliases.push({slug:service.slug,route,target:normalizedSocialRoute(url.href)});continue;}}
  canonical.push(service);
 }
 return{services:canonical,aliases,excluded,publishedRecords:services};
}
export function jpegDimensions(buffer){
 if(buffer.length<10||buffer[0]!==255||buffer[1]!==216)throw Error('Social asset is not JPEG');
 let p=2;while(p+8<buffer.length){if(buffer[p++]!==255)continue;while(buffer[p]===255)p++;const marker=buffer[p++];if(marker===217||marker===218)break;if(marker===216||(marker>=208&&marker<=215))continue;
 const length=buffer.readUInt16BE(p);if(length<2||p+length>buffer.length)break;
 if([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker))return{height:buffer.readUInt16BE(p+3),width:buffer.readUInt16BE(p+5)};
 p+=length;
 }throw Error('JPEG dimensions unavailable');
}
