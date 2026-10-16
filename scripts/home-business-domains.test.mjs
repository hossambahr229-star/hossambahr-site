import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {BUSINESS_DOMAINS,businessDomainGroups,serviceBusinessDomain,serviceReadiness} from '../business-domains.js';
import {discoverServices} from '../transaction-discovery.js';
const {services}=JSON.parse(fs.readFileSync('src/registry/published-services.json','utf8'));
const compact=JSON.parse(fs.readFileSync('transaction-discovery-data.json','utf8'));
test('every published transaction has exactly one visible business area and a working filtered entry',()=>{
 const groups=businessDomainGroups(services);assert.equal(groups.length,11);const all=groups.flatMap(g=>g.services.map(s=>s.slug));assert.equal(all.length,services.length);assert.equal(new Set(all).size,services.length);
 for(const s of services){const domain=serviceBusinessDomain(s);assert.ok(BUSINESS_DOMAINS.some(d=>d.id===domain));assert.ok(discoverServices(compact,{domain}).some(row=>row.s===s.slug),s.slug);}
});
test('readiness never implies protected backend execution',()=>{assert.equal(serviceReadiness({dv:false}),'PARTIAL');assert.equal(serviceReadiness({dv:true,destinationKind:'OFFICIAL_GUIDANCE'}),'OFFICIAL_GUIDANCE');assert.equal(serviceReadiness({dv:true,destinationKind:'DIRECT_SERVICE'}),'VERIFIED_INFORMATION_AND_OFFICIAL_ROUTE');});
test('homepage visibly exposes the actual diversity without changing the approved hero',()=>{
 for(const locale of ['ar','en']){const html=fs.readFileSync(locale==='en'?'en/index.html':'index.html','utf8');assert.equal((html.match(/data-home-domains/g)||[]).length,1);assert.equal((html.match(/data-business-domain=/g)||[]).length,11);assert.ok(html.indexOf('data-home-domains')>html.indexOf('premium-ai-showcase'));assert.ok(html.indexOf('data-home-domains')<html.indexOf('premium-featured'));assert.match(html,/service-areas/);assert.match(html,/data-premium-ai-open/);}
 const coverage=JSON.parse(fs.readFileSync('service-capability-coverage.json','utf8'));assert.equal(coverage.summary.structuralOrphans,0);assert.equal(coverage.businessDomains.length,11);assert.ok(coverage.services.every(s=>s.customerFacingEntry==='/#service-areas'&&s.readiness&&s.discoveryRoute.includes('domain=')));
});
