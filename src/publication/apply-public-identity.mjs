import {readFile,writeFile,readdir,mkdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';import {createHash} from 'node:crypto';
import {publicIdentityCSS} from '../design/public-identity.mjs';
const root=resolve(import.meta.dirname,'../..'),css=publicIdentityCSS(),version=createHash('sha256').update(css).digest('hex').slice(0,12);
await writeFile(join(root,'public-identity.css'),css);
const top=['services','categories','authorities','discover','approvals','business-activities','for','faq','methodology','contact','pricing','privacy','accessibility','updates'];
const files=new Set(['index.html','en/index.html']);async function visit(dir){let entries;try{entries=await readdir(join(root,dir),{withFileTypes:true});}catch(e){if(e.code==='ENOENT')return;throw e;}for(const entry of entries){const file=dir+'/'+entry.name;if(entry.isDirectory())await visit(file);else if(entry.name==='index.html')files.add(file);}}
for(const locale of['','en/'])for(const dir of top)await visit(locale+dir);
let updated=0,skipped=0;for(const file of files){let html=await readFile(join(root,file),'utf8');if(/data-safe-legacy-redirect|http-equiv=["']refresh["']/i.test(html)){skipped++;continue;}
 html=html.replace(/<link\b[^>]*href=["']\/public-identity\.css(?:\?[^"']*)?["'][^>]*>/gi,'');
 if(!html.includes('</head>'))throw Error('Missing public head: '+file);
 html=html.replace('</head>','<link rel="stylesheet" href="/public-identity.css?v='+version+'" data-hb-public-identity="2026.11"></head>');
 await writeFile(join(root,file),html);updated++;
}
await mkdir(join(root,'artifacts/public-identity'),{recursive:true});await writeFile(join(root,'artifacts/public-identity/publication.json'),JSON.stringify({version,updated,skipped,protectedRoutesTouched:false},null,2)+'\n');
console.log(JSON.stringify({publicIdentity:'APPLIED',version,pages:updated,protectedRoutesTouched:false}));
