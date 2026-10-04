import {readFile,writeFile,readdir} from 'node:fs/promises';import {resolve,join} from 'node:path';
const root=resolve(import.meta.dirname,'../..');const excluded=new Set(['.git','node_modules','artifacts','outputs','work','visual-layout-audit','final-platform-acceptance','production-browser']);
async function update(dir){for(const entry of await readdir(dir,{withFileTypes:true})){if(excluded.has(entry.name))continue;const path=join(dir,entry.name);if(entry.isDirectory())await update(path);else if(entry.name.endsWith('.html')){const before=await readFile(path,'utf8');const after=before.replace(/src="\/(public-ai-concierge|auth-client|ui-i18n)\.js(?:\?[^"<>]*)?"/g,'src="/$1.js?v=english-continuity-20261004"');if(after!==before)await writeFile(path,after);}}}
await update(root);
console.log('AI and authentication runtime version synchronized across generated pages.');
