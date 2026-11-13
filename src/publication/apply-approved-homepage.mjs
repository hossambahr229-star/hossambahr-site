import {readFile,writeFile,mkdir,readdir,access} from 'node:fs/promises';
import {join,resolve,relative} from 'node:path';
import {createHash} from 'node:crypto';
import {renderApprovedHomepage} from '../design/approved-home.mjs';
const root=resolve(import.meta.dirname,'../..');
const records=JSON.parse(await readFile(join(root,'transaction-discovery-data.json'),'utf8'));
const summary=JSON.parse(await readFile(join(root,'platform-summary.json'),'utf8'));
if(records.length!==summary.services)throw Error('Homepage and published catalog disagree');
const hash=value=>createHash('sha256').update(value).digest('hex');
const files=[];async function scan(dir){for(const e of await readdir(join(root,dir),{withFileTypes:true})){if(['.git','node_modules','artifacts','diagnostics','reports','outputs','work','src','test','supabase','_next','.github'].includes(e.name))continue;const path=dir?dir+'/'+e.name:e.name;if(e.isDirectory())await scan(path);else if(e.name.endsWith('.html'))files.push(path);}}await scan('');
const before=new Map(await Promise.all(files.map(async file=>[file,await readFile(join(root,file),'utf8')])));
const css=await readFile(join(root,'approved-home.css'),'utf8'),version=hash(css).slice(0,12);
const decode=s=>s.replaceAll('&amp;','&').replaceAll('&quot;','"').replaceAll('&#39;',"'");
const hrefs=s=>[...s.matchAll(/<a\b[^>]*\bhref="([^"]+)"/g)].map(m=>decode(m[1]));
const changed=[];let model;
for(const en of [false,true]){
 const route=en?'en/index.html':'index.html';let html=before.get(route);
 if(!html?.includes('id="premium-ai-panel"'))throw Error('Existing assistant panel missing in '+route);
 const panel=html.match(/<aside\b[^>]*\bid="premium-ai-panel"[^>]*>[\s\S]*?<\/aside>/)?.[0];
 if(!panel)throw Error('Assistant panel must survive homepage composition');
 const backdrop=html.match(/<(?:div|button)\b[^>]*\bclass="premium-ai-backdrop"[^>]*>[\s\S]*?<\/(?:div|button)>/)?.[0]||'<button type="button" class="premium-ai-backdrop" data-premium-ai-close aria-label="'+(en?'Close assistant':'إغلاق المساعد')+'" hidden></button>';
 const result=renderApprovedHomepage({records,summary,en});model=result.model;
 const first=html.search(/<header\b/),end=html.indexOf('</footer>');
 if(first<0||end<first)throw Error('Missing source homepage boundaries');
 html=html.slice(0,first)+result.header+result.main+panel+backdrop+result.footer+html.slice(end+9);
 html=html.replace(/<body\b([^>]*)>/,(_,attrs)=>'<body'+attrs.replace(/\sdata-approved-home="[^"]*"/g,'')+' data-approved-home="2026-11-13">');
 // Old coordinates belong to the superseded design; keep them for historical inner-page compatibility.
 html=html.replace(/<link\b[^>]*href="\/(?:home-geometry|approved-home)\.css[^" ]*"[^>]*>/g,'');
 html=html.replace('</head>','<link data-approved-home-css rel="stylesheet" href="/approved-home.css?v='+version+'"></head>');
 if((html.match(/<main\b/g)||[]).length!==1||(html.match(/<\/main>/g)||[]).length!==1)throw Error('Homepage requires one balanced main');
 if((html.match(/id="premium-ai-panel"/g)||[]).length!==1)throw Error('Assistant duplicated');
 for(const href of hrefs(result.header+result.main+result.footer)){
  if(!href.startsWith('/'))continue;const url=new URL(href,'https://hossambahr.com');const file=join(root,decodeURIComponent(url.pathname),url.pathname.endsWith('/')?'index.html':'');
  await access(file).catch(()=>{throw Error('New homepage link has no published destination: '+href)});
 }
 await writeFile(join(root,route),html);changed.push({route,before:hash(before.get(route)),after:hash(html),retained:hrefs(before.get(route)).filter(href=>hrefs(html).includes(href)),removedFromHomepageOnly:hrefs(before.get(route)).filter(href=>!hrefs(html).includes(href)),added:hrefs(html).filter(href=>!hrefs(before.get(route)).includes(href))});
}
for(const [file,content] of before){if(['index.html','en/index.html'].includes(file))continue;if(hash(await readFile(join(root,file)))!==hash(content))throw Error('Homepage publication changed an inner page: '+file);}
const coverage={services:records.length,authorities:model.authorities.length,emirates:model.emirates.length,areas:model.areas.map(g=>({key:g.key,count:g.records.length,ids:g.records.map(r=>r.id)})),covered:model.covered,emirateMatrix:model.emirates.map(g=>({key:g.key,scope:g.ar,count:g.records.length,ids:g.records.map(r=>r.id)})),authorityMatrix:model.authorities.map(g=>({key:g.key,count:g.records.length,ids:g.records.map(r=>r.id)})),canonicalRoutes:records.map(r=>({id:r.id,ar:r.u,en:'/en'+r.u,official:r.officialUrl})),nonHomepageHTMLFilesUntouched:files.length-2};
await mkdir(join(root,'artifacts/approved-home'),{recursive:true});
await writeFile(join(root,'artifacts/approved-home/coverage.json'),JSON.stringify(coverage,null,2)+'\n');
await writeFile(join(root,'artifacts/approved-home/link-delta.json'),JSON.stringify({scope:'Homepage navigation presentation only. Destination pages, canonical identities and service facts unchanged.',changed},null,2)+'\n');
console.log(JSON.stringify({approvedHomepage:'2026-11-13',services:records.length,areas:model.areas.length,nonHomepageHTMLFilesUntouched:files.length-2,version}));
