import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {canonicalDiscoveryRecords,discoverServices,businessLicenceRenewalIntent} from '../transaction-discovery.js';
const source=JSON.parse(readFileSync(new URL('../transaction-discovery-data.json',import.meta.url),'utf8'));
const records=canonicalDiscoveryRecords(source,[{slug:'renew-business-license-ajman',targetSlug:'ajman-commercial-license-renewal'}]);
for(const query of ['تجديد رخصة تجارية عجمان','عايز اجدد رخصة تجارية عجمان','Renew business license Ajman','Renew commercial licence Ajman']){
 test('Exact transaction and emirate: '+query,()=>assert.deepEqual(discoverServices(records,{query}).map(s=>s.s),['ajman-commercial-license-renewal']));
}
for(const query of ['تجديد رخصة تجارية دبي','Renew trade licence Dubai']){
 test('Dubai renewal excludes other emirates, identity and residence: '+query,()=>assert.deepEqual(discoverServices(records,{query}).map(s=>s.s),['renew-business-license-dubai']));
}
test('Explicit emirate filter remains authoritative',()=>assert.deepEqual(discoverServices(records,{query:'تجديد رخصة تجارية عجمان',emirate:'دبي'}).map(s=>s.s),['renew-business-license-dubai']));
test('General discovery retains the full canonical catalog',()=>{assert.equal(source.length,203);assert.equal(discoverServices(records).length,202);});
test('NOC approval is not coerced to licence renewal',()=>{const query='طلب شهادة عدم ممانعة لتجديد رخصة تجارية من RTA';assert.equal(businessLicenceRenewalIntent(query),false);assert.ok(discoverServices(records,{query}).some(s=>s.i==='rta-dubai'));});
test('SIRA scope and clarification remain intact',()=>{const found=discoverServices(records,{query:'موافقة سيرا'});assert.equal(found.length,2);assert.ok(found.every(s=>s.i==='sira-dubai'));assert.equal(discoverServices(records,{query:'موافقة سيرا الشارقة'}).length,0);});
test('Named Dubai residence query cannot return outside-Dubai records',()=>{const found=discoverServices(records,{query:'تجديد إقامة دبي'});assert.ok(found.length);assert.ok(found.every(s=>s.m==='دبي'));});

test('Exact English NOC title retains its RTA service',()=>assert.ok(discoverServices(records,{query:'Apply for an NOC to Renew a Trade Licence',authority:'rta-dubai'}).some(s=>s.s==='rta-renew-trade-license-noc-dubai')));

test('Every exact published English title retains its service identity',()=>{for(const service of source)assert.ok(discoverServices(source,{query:service.e,authority:service.i}).some(s=>s.id===service.id),service.s);});
test('Outside Dubai is an exclusion, not a request for Dubai',()=>{const found=discoverServices(records,{query:'Issue a residence permit for parents through ICP (outside Dubai)'});assert.ok(found.some(s=>s.s==='إصدار-إقامة-للوالدين-عبر-icp-خارج-دبي'));assert.ok(found.every(s=>s.m!=='دبي'));});
