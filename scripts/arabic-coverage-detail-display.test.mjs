import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,writeFile,copyFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,dirname,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
test('Arabic coverage generator renders honest missing-detail labels and preserves recorded facts',async()=>{
 const root=await mkdtemp(join(tmpdir(),'hb-coverage-display-'));
 try{
  for(const dir of ['src/publication','src/registry','content','services'])await mkdir(join(root,dir),{recursive:true});
  for(const file of ['src/publication/generate-dubai-coverage-pages.mjs','src/registry/recorded-fact-state.mjs','service-capabilities.js'])await copyFile(new URL('../'+file,import.meta.url),join(root,file));
  const coverage=JSON.parse(await readFile(new URL('../content/government-coverage-expansion.json',import.meta.url),'utf8'));
  const original=coverage.authorities.find(x=>x.id==='uaq-business');
  const service=original.newVerifiedServices.find(x=>x.slug==='umm-al-quwain-trade-name-official-path');
  assert.equal(service.fees,'NOT_OFFICIALLY_PUBLISHED');assert.equal(service.duration,'NOT_OFFICIALLY_PUBLISHED');
  const known={...service,slug:'recorded-fact-fixture',fees:'100 درهم وفق المصدر',duration:'يومان وفق المصدر'};
  await writeFile(join(root,'content/government-coverage-expansion.json'),JSON.stringify({authorities:[{...original,summary:{canonicalServices:0,realServices:2},newVerifiedServices:[service,known]}]}));
  await writeFile(join(root,'src/registry/registry.json'),JSON.stringify({services:[]}));
  await writeFile(join(root,'services/index.html'),'<div></div><p id="det-empty">');
  await writeFile(join(root,'sitemap.xml'),'<urlset></urlset>');
  const result=spawnSync(process.execPath,[join(root,'src/publication/generate-dubai-coverage-pages.mjs')],{encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
  const html=await readFile(join(root,'services',service.slug,'index.html'),'utf8');
  assert.doesNotMatch(html,/NOT_OFFICIALLY_PUBLISHED/);
  assert.equal((html.match(/لم تتوفر معلومة موثقة في سجل المنصة/g)||[]).length,2);
  assert.ok(html.includes(service.requirements[0]));assert.ok(html.includes(service.officialUrl));
  const recorded=await readFile(join(root,'services',known.slug,'index.html'),'utf8');
  assert.ok(recorded.includes(known.fees));assert.ok(recorded.includes(known.duration));
 }finally{assert.equal(dirname(root),resolve(tmpdir()));assert.ok(root.startsWith(join(resolve(tmpdir()),'hb-coverage-display-')));await rm(root,{recursive:true,force:true});}
});
