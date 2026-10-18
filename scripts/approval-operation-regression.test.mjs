import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {approvalType} from '../service-capabilities.js';
import {serviceBusinessDomain} from '../business-domains.js';
const records=JSON.parse(readFileSync(new URL('../transaction-discovery-data.json',import.meta.url)));
const removed=['vehicle-clearance-certificate-dubai-customs','سداد-غرامة-مخالفة-تأشيرة-أو-إقامة-عبر-icp-خارج-دبي','متابعة-حالة-طلب-تأشيرة-لدى-icp-خارج-دبي'];
const permits=['det-event-permit-dubai','food-related-activity-permit-dubai','industrial-environmental-clearance-dubai','legacy-service-85a10469d8','new-building-permit-dubai'];
test('payment, tracking and customs certificates remain services without approval classification',()=>{
 for(const slug of removed){const r=records.find(s=>s.s===slug);assert.ok(r,slug);assert.equal(approvalType(r),null,slug);}
});
test('actual activity and facility permits are discoverable under approvals',()=>{
 for(const slug of permits){const r=records.find(s=>s.s===slug);assert.ok(r,slug);assert.equal(approvalType(r),'sector-permit',slug);assert.equal(serviceBusinessDomain(r),'approvals',slug);}
});
test('all published records preserve valid classification across compact and canonical shapes',()=>{
 for(const r of records){
 const canonical={slug:r.s,name:{ar:r.a,en:r.e},authority:{id:r.i},classification:{main:r.c}};
 assert.equal(approvalType(canonical),approvalType(r),r.s);
 assert.equal(serviceBusinessDomain(canonical),serviceBusinessDomain(r),r.s);
 assert.ok(serviceBusinessDomain(r));
 if(!removed.includes(r.s)) assert.equal(approvalType(r),r.ap||null,r.s);
 if(!permits.includes(r.s)) assert.equal(serviceBusinessDomain(r),r.bd,r.s);
 }
 for(const type of ['security-system','specialist-licence','economic-initial','noc','work-permit','residence-permit'])assert.ok(records.some(r=>approvalType(r)===type),type);
});
