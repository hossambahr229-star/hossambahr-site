import {readFile,writeFile,readdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {pathwayMarkup} from '../../service-pathways.js';
const root=resolve(import.meta.dirname,'../..');
const {services}=JSON.parse(await readFile(join(root,'src/registry/published-services.json'),'utf8'));
const version=createHash('sha256').update(await readFile(join(root,'service-pathways.js'))).update(await readFile(join(root,'service-pathways.css'))).digest('hex').slice(0,12);
const routes=new Map(services.flatMap(s=>[['.'+s.internalRoute,s],['./en'+s.internalRoute,s]]));
const excluded=new Set(['.git','node_modules','src','supabase','test','tests','artifacts','reports','outputs','work','diagnostics','.github','account','os','owner','dashboard','auth']);
async function walk(dir){for(const entry of await readdir(dir,{withFileTypes:true})){
 if(entry.isDirectory()){if(!excluded.has(entry.name)&&!entry.name.startsWith('.'))await walk(join(dir,entry.name));continue;}
 if(entry.name!=='index.html')continue;
 const file=join(dir,entry.name);let html=await readFile(file,'utf8');if(!html.includes('<main'))continue;
 const locale=/<html\b[^>]*lang="en"/.test(html)?'en':'ar';
 const relative='.'+dir.slice(root.length).replaceAll('\\','/')+'/';const service=routes.get(relative);
 if(service&&!html.includes('data-hb-pathways='))html=html.replace(/(<h1\b[^>]*>[\s\S]*?<\/h1>)/,'$1'+pathwayMarkup(service,locale));
 html=html.replace(/<link\b[^>]*href="\/service-pathways\.css[^>]*>/g,'').replace(/<script\b[^>]*src="\/service-pathways\.js[^>]*><\/script>/g,'');
 html=html.replace('</head>',`<link rel="stylesheet" href="/service-pathways.css?v=${version}"><script type="module" src="/service-pathways.js?v=${version}"></script></head>`);
 await writeFile(file,html);
}}
await walk(root);
console.log(JSON.stringify({servicePathways:services.length,locales:2,whatsapp:'canonical-context-only'}));

