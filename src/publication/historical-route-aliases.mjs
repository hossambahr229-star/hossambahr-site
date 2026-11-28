import {readFile,writeFile,mkdir,access} from 'node:fs/promises';
import {resolve,relative,isAbsolute,dirname} from 'node:path';
const origin='https://hossambahr.com';
const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
export function historicalAliasHTML(entry){
 if(!/^\/(?:[a-z0-9_-]+\/)*[a-z0-9_-]+\.html$/i.test(entry.from))throw Error('Only explicit observed legacy HTML paths are allowed');
 if(!entry.to?.startsWith('/')||entry.to.startsWith('//')||/[\\\u0000-\u001f]/.test(entry.to))throw Error('Alias destination must be a safe internal route');
 const target=new URL(entry.to,origin);if(target.origin!==origin||target.username||target.password)throw Error('External alias destination');
 const canonical=origin+target.pathname;
 const script='const target=new URL('+JSON.stringify(entry.to).replaceAll('<','\\u003c')+',location.origin);for(const [key,value] of new URLSearchParams(location.search)){if(!target.searchParams.has(key))target.searchParams.append(key,value);}if(!target.hash)target.hash=location.hash;location.replace(target.pathname+target.search+target.hash);';
 return '<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,follow"><link rel="canonical" href="'+escape(canonical)+'"><title>الرابط الحالي | HOSSAM BAHR</title><script data-safe-legacy-redirect>'+script+'</script><meta data-safe-legacy-refresh http-equiv="refresh" content="0; url='+escape(entry.to)+'"></head><body><main><h1>تم تحديث رابط هذه الصفحة</h1><p><a href="'+escape(entry.to)+'">الانتقال إلى الصفحة الحالية</a></p></main></body></html>\n';
}
export async function publishHistoricalAliases(root,manifest){
 const seen=new Set(),report=[];
 for(const entry of manifest.entries){
  if(seen.has(entry.from))throw Error('Duplicate historical alias: '+entry.from);seen.add(entry.from);
  const html=historicalAliasHTML(entry),target=new URL(entry.to,origin),targetFile=resolve(root,'.'+decodeURIComponent(target.pathname),target.pathname.endsWith('/')?'index.html':'');
  const rel=relative(root,targetFile);if(rel.startsWith('..')||isAbsolute(rel))throw Error('Alias target escaped the site');
  await access(targetFile);const targetHTML=await readFile(targetFile,'utf8');
  if(target.hash&&!targetHTML.includes('id="'+decodeURIComponent(target.hash.slice(1))+'"'))throw Error('Missing alias target fragment: '+entry.to);
  const file=resolve(root,'.'+entry.from);try{const old=await readFile(file,'utf8');if(!old.includes('data-safe-legacy-redirect'))throw Error('Refusing to overwrite an existing content page: '+entry.from);}catch(e){if(e.code!=='ENOENT')throw e;}
  await mkdir(dirname(file),{recursive:true});await writeFile(file,html,'utf8');report.push({...entry,canonical:origin+target.pathname,queryAndHashPreservedWithJavaScript:true,noNewIndexedPage:true});
 }
 return report;
}
