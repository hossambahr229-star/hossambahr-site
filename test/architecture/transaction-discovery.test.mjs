import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {entryMode,discoverServices} from '../../transaction-discovery.js';
import {englishDiscoveryRecords} from '../../src/publication/english-catalog.mjs';
const {services}=JSON.parse(readFileSync(new URL('../../src/registry/published-services.json',import.meta.url)));
const records=englishDiscoveryRecords(services).map((r,i)=>({...r,id:services[i].id}));
test('beginners may express a goal while experts retain direct transaction search',()=>{
 for(const query of ['عايز أجيب زوجتي دبي','عايز أفتح شركة في الشارقة','الرخصة انتهت','عايز ألغي عامل','عايز إقامة ذهبية','عايز أجيب أمي','I want to sponsor my wife in Dubai.'])assert.equal(entryMode(query),'describe',query);
 for(const query of ['Golden Residence','Cancellation of Work Permit','Ejari','تجديد إقامة'])assert.equal(entryMode(query),'exact',query);
});
test('exact discovery and filtered authority discovery converge on canonical service identity',()=>{
 for(const service of records){const exact=discoverServices(records,{query:service.e,authority:service.i});assert.ok(exact.some(r=>r.id===service.id),service.s);for(const row of exact)assert.equal(row.i,service.i);}
 assert.equal(new Set(records.map(s=>s.id)).size,services.length);
});
test('federal and ICP jurisdiction filters never route a Dubai user into an outside-Dubai service',()=>{
 const scoped=discoverServices(records,{emirate:'دبي'});assert.ok(scoped.length);assert.ok(scoped.every(s=>!s.m.includes('خارج دبي')&&s.m!=='الإمارات عدا دبي'));
 for(const emirate of ['دبي','أبوظبي','الشارقة','عجمان','رأس الخيمة','الفجيرة','أم القيوين'])assert.ok(discoverServices(records,{emirate}).length,emirate);
});
