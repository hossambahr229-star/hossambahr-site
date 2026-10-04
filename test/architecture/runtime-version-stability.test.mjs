import test from 'node:test';import assert from 'node:assert/strict';import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';import {execFile} from 'node:child_process';import {promisify} from 'node:util';
const run=promisify(execFile);
test('runtime publication is stable across repeated builds and invalidates after a real asset change',async()=>{
 const root=await mkdtemp(join(tmpdir(),'hb-runtime-version-'));try{
  const dir=join(root,'src/publication');await mkdir(dir,{recursive:true});await writeFile(join(dir,'update-ai-runtime-version.mjs'),await readFile(new URL('../../src/publication/update-ai-runtime-version.mjs',import.meta.url)));
  for(const name of ['public-ai-concierge','auth-client','ui-i18n','os-client','os-i18n','english-catalog','intent-search'])await writeFile(join(root,name+'.js'),name==='os-client'?"import('/intent-search.js?v=old');":'// '+name);
  await writeFile(join(root,'index.html'),'<script src="/os-client.js?v=old"></script><script src="/auth-client.js"></script>');
  await run(process.execPath,[join(dir,'update-ai-runtime-version.mjs')]);const first=await readFile(join(root,'index.html'),'utf8');assert.match(first,/v=[a-f0-9]{12}/);
  await run(process.execPath,[join(dir,'update-ai-runtime-version.mjs')]);assert.equal(await readFile(join(root,'index.html'),'utf8'),first,'Second build must not churn runtime URLs');
  await writeFile(join(root,'intent-search.js'),'// changed ranking');await run(process.execPath,[join(dir,'update-ai-runtime-version.mjs')]);assert.notEqual(await readFile(join(root,'index.html'),'utf8'),first,'Real ranking changes must invalidate cached parent runtime');assert.doesNotMatch(await readFile(join(root,'os-client.js'),'utf8'),/v=old/);
 }finally{await rm(root,{recursive:true,force:true});}
});
