import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {rankServices} from '../../intent-search.js';import {englishDiscoveryRecords,emirateEnglish} from '../../src/publication/english-catalog.mjs';
const {services}=JSON.parse(readFileSync(new URL('../../src/registry/published-services.json',import.meta.url),'utf8'));const english=englishDiscoveryRecords(services);const source=readFileSync(new URL('../../intent-search-data.js',import.meta.url),'utf8');const shared=JSON.parse(source.slice(source.indexOf('=')+1).replace(/;\s*$/,''));
const records=english;
test('all 200 canonical service names retain identity when their jurisdiction is appended in either language',()=>{
 for(const catalog of [english,shared])for(const service of services)for(const [name,scope] of [[service.name.ar,service.emirate],[service.name.en,emirateEnglish(service.emirate)]]){const hit=rankServices(name+' '+scope,catalog)[0];assert.equal(hit?.s,service.slug,name+' '+scope);}
});
test('a conflicting emirate never receives the exact scoped identity boost',()=>{
 const row=records.find(s=>s.s==='golden-residency-uae');const results=rankServices(row.e+' in Abu Dhabi',[row]);assert.ok(results.every(r=>r.score!==10000));
});
