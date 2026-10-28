import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync}from'node:fs';import{businessDomainGroups}from'../../business-domains.js';import{renderHomepageDiscovery}from'../../src/publication/home-discovery-section.mjs';
const registry=JSON.parse(readFileSync('src/registry/published-services.json','utf8')),groups=businessDomainGroups(registry.services),before=JSON.stringify(registry);
test('homepage keeps every transaction shortcut in its existing domain behind a native disclosure',()=>{
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
  for(const tile of html.matchAll(/<div class="home-domain-tile"[^>]*>[\s\S]*?<\/div>/g))assert.doesNotMatch(tile[0],/data-home-service=/,'Initial area choices do not expose competing transaction links');
  assert.ok(html.includes(p+'/business-activities/'));assert.ok(html.includes(p+'/approvals/'));assert.equal(JSON.stringify(registry),before,'no catalog mutation');
 }
});
