import {readFile,writeFile,readdir,mkdir} from 'node:fs/promises';
import {resolve,join,relative} from 'node:path';
const root=resolve(import.meta.dirname,'../..'),origin='https://hossambahr.com';
const decode=v=>String(v??'').replaceAll('&amp;','&').replaceAll('&quot;','"').replaceAll('&#39;',"'");
const attrs=tag=>Object.fromEntries([...tag.matchAll(/([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)].map(m=>[m[1].toLowerCase(),decode(m[2]??m[3]??m[4])]));
const tags=(html,name)=>[...html.matchAll(new RegExp('<'+name+'\\b[^>]*>','gi'))].map(m=>({tag:m[0],attrs:attrs(m[0])}));
const canonical=html=>tags(html,'link').find(t=>t.attrs.rel?.toLowerCase()==='canonical')?.attrs.href;
const protectedRoute=route=>/^\/(?:en\/)?(?:auth|account|os|command-center|owner|dashboard)(?:\/|$)/.test(route);
function eligible(html,route){
 if(protectedRoute(route)||/data-safe-legacy-redirect/i.test(html))return false;
 const meta=tags(html,'meta');
 if(meta.some(t=>t.attrs.name?.toLowerCase()==='robots'&&/\bnoindex\b/i.test(t.attrs.content??'')))return false;
 if(meta.some(t=>t.attrs['http-equiv']?.toLowerCase()==='refresh'))return false;
 try{return new URL(canonical(html),origin).href===new URL(route,origin).href;}catch{return false;}
}
async function englishFiles(dir){
 const files=[];for(const e of await readdir(dir,{withFileTypes:true})){const p=join(dir,e.name);if(e.isDirectory())files.push(...await englishFiles(p));else if(e.isFile()&&e.name==='index.html')files.push(p);}return files;
}
const report={source:'FINAL_PUBLICATION_LANGUAGE_PAIRS',paired:[],aliases:[],skipped:[]};
for(const enFile of await englishFiles(join(root,'en'))){
 const enRoute='/'+relative(root,enFile).replaceAll('\\','/').replace(/index\.html$/,''),arRoute=enRoute.replace(/^\/en\//,'/');
 const arFile=join(root,arRoute.slice(1),'index.html');let en,ar;
 try{[en,ar]=await Promise.all([readFile(enFile,'utf8'),readFile(arFile,'utf8')]);}catch{report.skipped.push({enRoute,reason:'No published Arabic counterpart'});continue;}
 let arCanonical;try{arCanonical=new URL(canonical(ar),origin);}catch{}
 if(arCanonical?.origin===origin&&!arCanonical.search&&!arCanonical.hash&&arCanonical.href!==new URL(arRoute,origin).href){
  const targetArRoute=decodeURIComponent(arCanonical.pathname),targetEnRoute='/en'+targetArRoute;let targetAr,targetEn;
  try{[targetAr,targetEn]=await Promise.all([readFile(join(root,targetArRoute.slice(1),'index.html'),'utf8'),readFile(join(root,targetEnRoute.slice(1),'index.html'),'utf8')]);}catch{}
  if(targetAr&&targetEn&&eligible(targetAr,targetArRoute)&&eligible(targetEn,targetEnRoute)){
   const stripAlternates=html=>html.replace(/<link\b[^>]*>/gi,tag=>{const a=attrs(tag);return a.rel?.toLowerCase()==='alternate'&&a.hreflang?'':tag;});
   en=stripAlternates(en).replace(/<link\b[^>]*>/gi,tag=>attrs(tag).rel?.toLowerCase()==='canonical'?'':tag).replace('</head>','<link rel="canonical" href="'+new URL(targetEnRoute,origin).href+'"></head>');
   await writeFile(enFile,en);await writeFile(arFile,stripAlternates(ar));report.aliases.push({ar:arRoute,en:enRoute,canonicalAr:targetArRoute,canonicalEn:targetEnRoute});continue;
  }
 }
 if(!eligible(en,enRoute)||!eligible(ar,arRoute)){report.skipped.push({enRoute,reason:'Protected, redirected, noindex or noncanonical counterpart'});continue;}
 const links=[['ar',arRoute],['en',enRoute],['x-default',arRoute]].map(([lang,route])=>'<link rel="alternate" hreflang="'+lang+'" href="'+new URL(route,origin).href+'">').join('');
 const normalize=html=>html.replace(/<link\b[^>]*>/gi,tag=>{const a=attrs(tag);return a.rel?.toLowerCase()==='alternate'&&a.hreflang?'':tag;}).replace('</head>',links+'</head>');
 await writeFile(enFile,normalize(en));await writeFile(arFile,normalize(ar));report.paired.push({ar:arRoute,en:enRoute});
}
await mkdir(join(root,'artifacts/bilingual-seo'),{recursive:true});await writeFile(join(root,'artifacts/bilingual-seo/report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({languagePairs:report.paired.length,skipped:report.skipped.length,aliases:report.aliases.length}));
