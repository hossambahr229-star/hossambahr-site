import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {createHash} from 'node:crypto';
const run=promisify(execFile);
test('shared CSS gets content versions and still refreshes through the next complete publication',async()=>{
 const root=await mkdtemp(join(tmpdir(),'hb-shared-style-'));
 try{
  const dir=join(root,'src/publication');await mkdir(dir,{recursive:true});
  for(const name of ['apply-a-plus-plus-system.mjs','update-ai-runtime-version.mjs'])await writeFile(join(dir,name),await readFile(new URL('../../src/publication/'+name,import.meta.url)));
  for(const name of ['public-ai-concierge','auth-client','ui-i18n','os-client','os-i18n','english-catalog','intent-search','activities','zero-defect-routing','a-plus-plus'])await writeFile(join(root,name+'.js'),name==='os-client'?"import('/intent-search.js?v=old');":'// '+name);
  await writeFile(join(root,'intent-first.css'),'body{line-height:1.5}');
  await writeFile(join(root,'a-plus-plus.css'),'.hb-a-plus-plus .page-hero:after{content:none}');
  const href='/_next/static/chunks/site.css',css=join(root,href.slice(1));
  await mkdir(join(root,'_next/static/chunks'),{recursive:true});await writeFile(css,'body{color:#103e36}');
  await mkdir(join(root,'en'),{recursive:true});
  const page=q=>'<html><head><link rel="stylesheet" href='+q+href+'?v=old'+q+'><link rel="stylesheet" href="/global-os.css?v=separate"><script src="/os-client.js?v=old"></script></head><body><main>Service</main></body></html>';
  await writeFile(join(root,'index.html'),page('"'));await writeFile(join(root,'en/index.html'),page("'"));
  const publish=async()=>{await run(process.execPath,[join(dir,'apply-a-plus-plus-system.mjs')]);await run(process.execPath,[join(dir,'update-ai-runtime-version.mjs')]);};
  const expected=async()=>createHash('sha256').update(await readFile(css)).digest('hex').slice(0,12);
  await publish();
  const first=await readFile(join(root,'index.html'),'utf8'),firstCss=await readFile(css,'utf8'),version=await expected();
  for(const file of ['index.html','en/index.html']){
   const html=await readFile(join(root,file),'utf8');assert.ok(html.includes(href+'?v='+version));assert.ok(html.includes('/global-os.css?v=separate'));
  }
  assert.ok(firstCss.includes('.page-hero:after{content:none}'));
  await publish();assert.equal(await readFile(join(root,'index.html'),'utf8'),first);assert.equal(await readFile(css,'utf8'),firstCss);
  await writeFile(join(root,'a-plus-plus.css'),'.hb-a-plus-plus .page-hero:after{content:none;color:#103e36}');
  await publish();
  const second=await readFile(join(root,'index.html'),'utf8'),secondCss=await readFile(css,'utf8');
  assert.notEqual(await expected(),version,'A genuine shared design change invalidates its cached URL');
  assert.notEqual(second,first);
  assert.equal(second.match(/os-client.js\?v=([a-f0-9]+)/)[1],first.match(/os-client.js\?v=([a-f0-9]+)/)[1],'CSS versioning need not churn unrelated runtime');
  assert.ok(secondCss.includes('content:none;color:#103e36'),'The owner must refresh an already versioned shared stylesheet');
  assert.equal((secondCss.match(/HOSSAMBAHR A\+\+ START/g)||[]).length,1);
  await publish();assert.equal(await readFile(join(root,'index.html'),'utf8'),second);assert.equal(await readFile(css,'utf8'),secondCss);
 }finally{await rm(root,{recursive:true,force:true});}
});
