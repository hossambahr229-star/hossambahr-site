import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync}from'node:fs';import{businessDomainGroups}from'../../business-domains.js';import{renderHomepageDiscovery}from'../../src/publication/home-discovery-section.mjs';
const registry=JSON.parse(readFileSync('src/registry/published-services.json','utf8')),groups=businessDomainGroups(registry.services),before=JSON.stringify(registry);
test('homepage shows one direct transaction per area and preserves the complete disclosed shortcut lists',()=>{
 for(const en of[false,true]){
  const p=en?'/en':'',html=renderHomepageDiscovery({domainGroups:groups,locale:en?'en':'ar',p,en,t:(ar,english)=>en?english:ar,esc:x=>String(x).replaceAll('&','&amp;').replaceAll('"','&quot;'),activityCount:2610});
  assert.equal((html.match(/data-business-domain=/g)||[]).length,11);assert.match(html,/data-home-discovery="task-shortcuts"/);
  assert.equal((html.match(/data-shortcut-domain=/g)||[]).length,groups.length);
  const disclosure=html.match(/<details\b[^>]*id="home-common-transactions"[^>]*>/)?.[0];assert.ok(disclosure);assert.doesNotMatch(disclosure,/\sopen(?:\s|=|>)/);
  for(const d of groups){
   const start=html.indexOf('data-shortcut-domain="'+d.id+'"'),end=html.indexOf('</nav>',start);assert.ok(start>=0&&end>start);
   const part=html.slice(start,end),slugs=[...part.matchAll(/data-home-service="([^"]+)"/g)].map(m=>m[1]);
   assert.ok(slugs.length>=1&&slugs.length<=3);assert.equal(new Set(slugs).size,slugs.length);
   for(const slug of slugs){const service=d.services.find(s=>s.slug===slug);assert.ok(service,'shortcut stays within its existing domain');assert.ok(part.includes('href="'+p+service.internalRoute+'"'));}
  }
  for(const tile of html.matchAll(/<div class="home-domain-tile"[^>]*>[\s\S]*?<\/div>/g)){
   const domain=tile[0].match(/data-business-domain="([^"]+)"/)?.[1],slugs=[...tile[0].matchAll(/data-home-service="([^"]+)"/g)].map(m=>m[1]);
   assert.equal(slugs.length,1,'Each area exposes one representative transaction');
   const service=groups.find(d=>d.id===domain)?.services.find(s=>s.slug===slugs[0]);
   assert.ok(service,'Visible transaction belongs to its current domain');
   assert.ok(tile[0].includes('href="'+p+service.internalRoute+'"'),'Visible transaction links directly to its localized canonical route');
  }
  assert.ok(html.includes(p+'/business-activities/'));assert.ok(html.includes(p+'/approvals/'));assert.equal(JSON.stringify(registry),before,'no catalog mutation');
 }
});
