import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
test('Five-year ICP visa exposes common conditions without promoting disputed eligibility',async()=>{
 const data=JSON.parse(await readFile('src/registry/published-services.json','utf8'));
 const record=data.services.find(r=>r.slug==='إصدار-تأشيرة-سياحية-متعددة-الدخول-لمدة-5-سنوات-عبر-icp');
 assert.ok(record);
 assert.equal(record.eligibilityScope,'common-only');
 assert.equal(record.verification.eligibilityVerified,false);
 assert.equal(record.verification.detailsVerified,false);
 assert.match(record.conditions,/180/);
 assert.match(record.conditions,/60/);
 assert.match(record.localizedDetails.en.eligibility,/Annual permitted-stay eligibility remains unresolved/);
 assert.ok(record.officialInformationUrl.includes('serviceid=68f5bc968c587a0011cb16cd'));
});
