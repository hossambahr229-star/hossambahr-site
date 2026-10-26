import test from'node:test';import assert from'node:assert/strict';import{readFile}from'node:fs/promises';import{createHash}from'node:crypto';
test('service pathway publication invalidates cached catalog metadata together with its runtime',async()=>{
 const root=new URL('../../',import.meta.url),hash=createHash('sha256');
 for(const asset of['service-pathways.js','service-pathways.css','customer-execution-data.json'])hash.update(await readFile(new URL(asset,root)));
 const version=hash.digest('hex').slice(0,12);
 const {services}=JSON.parse(await readFile(new URL('src/registry/published-services.json',root),'utf8'));
 for(const service of[services.find(s=>s.id==='directory:residency:34'),services.find(s=>s.slug==='family-residency-uae')])for(const prefix of['','en/']){
  const html=await readFile(new URL(prefix+service.internalRoute.slice(1)+'index.html',root),'utf8');
  assert.ok(html.includes('/service-pathways.js?v='+version),prefix+service.slug);
  assert.ok(html.includes('/service-pathways.css?v='+version),prefix+service.slug);
 }
});