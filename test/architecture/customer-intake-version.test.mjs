import test from 'node:test';import assert from 'node:assert/strict';import{readFile}from'node:fs/promises';import{createHash}from'node:crypto';
test('published request pages load the current intake and jurisdiction runtime rather than the legacy cached version',async()=>{
 const root=new URL('../../',import.meta.url);
 const version=createHash('sha256').update(await readFile(new URL('customer-intake.js',root))).update(await readFile(new URL('customer-jurisdiction.js',root))).digest('hex').slice(0,12);
 for(const route of['contact','pricing','en/contact','en/pricing']){
  const html=await readFile(new URL(route+'/index.html',root),'utf8');
  const scripts=[...html.matchAll(/<script\b[^>]*src="([^"]*customer-intake\.js[^"]*)"[^>]*>/g)];
  assert.equal(scripts.length,1,route);
  assert.equal(scripts[0][1],'/customer-intake.js?v='+version,route+' must invalidate the old cached intake module');
 }
});