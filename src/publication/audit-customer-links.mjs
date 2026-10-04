import {readFile,readdir,stat,mkdir,writeFile} from 'node:fs/promises';import {resolve,join} from 'node:path';
const root=resolve(import.meta.dirname,'../..'),out=resolve(process.env.HB_OUTPUT_DIR||join(root,'artifacts/customer-link-audit'));await mkdir(out,{recursive:true});
const files=[];async function walk(dir){for(const item of await readdir(dir,{withFileTypes:true})){if(['.git','node_modules','artifacts','reports','diagnostics','test','src','supabase','_next'].includes(item.name))continue;const path=join(dir,item.name);if(item.isDirectory())await walk(path);else if(item.name.endsWith('.html'))files.push(path);}}await walk(root);
const broken=[],references=[],canonicals=[];
for(const file of files){const route='/'+file.slice(root.length+1).replaceAll('\\','/').replace(/index\.html$/,'');const html=await readFile(file,'utf8');const canonical=html.match(/<link[^>]*rel="canonical"[^>]*href="([^"]*)"/)?.[1]||html.match(/<link[^>]*href="([^"]*)"[^>]*rel="canonical"/)?.[1];canonicals.push({route,canonical:canonical||null,locale:html.match(/<html[^>]*lang="([^"]*)"/)?.[1]||null});
 for(const match of html.matchAll(/<a\b[^>]*href="([^"]*)"[^>]*>/g)){
  const href=match[1].replaceAll('&amp;','&');let url;try{url=new URL(href,'https://hossambahr.com'+route);}catch{broken.push({referrer:route,href,reason:'INVALID_URL'});continue;}
  if(url.hostname!=='hossambahr.com'||!/^https?:$/.test(url.protocol)||href.startsWith('#'))continue;
  let target;try{target=decodeURIComponent(url.pathname);}catch{broken.push({referrer:route,href,reason:'INVALID_ENCODING'});continue;}
  const path=resolve(root,'.'+target);if(!path.startsWith(root+'\\')&&!path.startsWith(root+'/')&&path!==root){broken.push({referrer:route,href,reason:'OUTSIDE_SITE'});continue;}
  let exists=false;try{const s=await stat(path);exists=s.isFile()||(s.isDirectory()&&(await stat(join(path,'index.html'))).isFile());}catch{}
  const row={referrer:route,href,target,exists};references.push(row);if(!exists)broken.push({...row,reason:'MISSING_PUBLISHED_FILE'});
 }
}
const missingRoutes=[...new Set(broken.map(x=>x.target||x.href))];const report={status:broken.length?'FAIL':'PASS',scope:'Published internal anchor/file integrity, not live HTTP, redirect, content or customer journey acceptance.',pages:files.length,references:references.length,missingRoutes:missingRoutes.length,brokenReferences:broken.length,broken,canonicals};await writeFile(join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({status:report.status,pages:files.length,references:references.length,missingRoutes,brokenReferences:broken.length}));
