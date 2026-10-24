import {readFile,writeFile,readdir} from 'node:fs/promises';import {createHash} from 'node:crypto';import {resolve,join} from 'node:path';
const root=resolve(import.meta.dirname,'../..');const excluded=new Set(['.git','node_modules','artifacts','outputs','work','visual-layout-audit','final-platform-acceptance','production-browser']);
const runtimeNames=['public-ai-concierge','auth-client','ui-i18n','os-client','os-i18n','english-catalog','intent-search','activities','zero-defect-routing','a-plus-plus'];
const sharedStyleVersions=new Map();
async function versionSharedStyles(html){
 const matches=[...html.matchAll(/href=(["'])(\/_next\/static\/chunks\/[A-Za-z0-9._-]+\.css)(?:\?[^"'<>]*)?\1/g)];
 for(const match of matches){
  const href=match[2];
  if(!sharedStyleVersions.has(href))sharedStyleVersions.set(href,createHash('sha256').update(await readFile(join(root,href.slice(1)))).digest('hex').slice(0,12));
  html=html.replace(match[0],'href='+match[1]+href+'?v='+sharedStyleVersions.get(href)+match[1]);
 }
 return html;
}
async function update(dir){for(const entry of await readdir(dir,{withFileTypes:true})){if(excluded.has(entry.name))continue;const path=join(dir,entry.name);if(entry.isDirectory())await update(path);else if(entry.name.endsWith('.html')){const before=await readFile(path,'utf8');let after=before.replace(/src="\/?(public-ai-concierge|auth-client|ui-i18n|os-client|os-i18n|english-catalog|intent-search|activities|zero-defect-routing|a-plus-plus)\.js(?:\?[^"<>]*)?"/g,'src="/$1.js?v='+version+'"');after=await versionSharedStyles(after);if(after!==before)await writeFile(path,after);}}}
const osFile=join(root,'os-client.js');const osSource=await readFile(osFile,'utf8');const intentVersion=createHash('sha256').update(await readFile(join(root,'intent-search.js'))).digest('hex').slice(0,12);await writeFile(osFile,osSource.replace(/\/intent-search\.js\?v=[^'\"]+/g,'/intent-search.js?v='+intentVersion));
const hash=createHash('sha256');for(const name of runtimeNames)hash.update(await readFile(join(root,name+'.js')));hash.update(await readFile(join(root,'intent-first.css')));const version=hash.digest('hex').slice(0,12);
await update(root);
console.log('AI and authentication runtime version synchronized across generated pages.');
