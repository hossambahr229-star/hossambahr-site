import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {rankServices} from '../intent-search.js';
import {entryDestination} from '../transaction-discovery.js';
import {localActivityPathways} from '../business-activities-discovery.js';
const data=JSON.parse(await readFile(new URL('../transaction-discovery-data.json',import.meta.url),'utf8'));
for(const q of ['موافقة ريرا','موافقة RERA دبي','RERA approval']){
 const found=rankServices(q,data);assert.equal(found.length,2);assert.ok(found.every(s=>s.i==='dld-rera'));
}
assert.equal(rankServices('موافقة ريرا الشارقة',data).length,0);
assert.deepEqual(rankServices('تصريح إعلان RERA دبي',data).map(s=>s.s),['dld-real-estate-ad-permit-dubai']);
assert.deepEqual(rankServices('RERA professional practice approval',data).map(s=>s.s),['real-estate-professional-practice-card-dubai']);
for(const q of ['كافتيريا عجمان','شركة مواد غذائية دبي','foodstuff company Dubai','عايز أفتح مطعم'])assert.equal(entryDestination(q),'business-activities',q);
for(const q of ['تجديد رخصة كافتيريا','إلغاء رخصة كافتيريا','موافقة كاميرات مراقبة','موافقة مطعم دبي'])assert.notEqual(entryDestination(q),'business-activities',q);
const local=localActivityPathways(data,'عجمان');assert.equal(local[0].s,'ajman-business-activity-inquiry');assert.ok(local.every(s=>s.m==='عجمان'));assert.ok(local.some(s=>s.s==='ajman-commercial-license-issuance'));
for(const q of ['موافقة سيرا','موافقة SIRA دبي','ترخيص نشاط أمني','موافقة كاميرات مراقبة'])assert.ok(rankServices(q,data).every(s=>s.i==='sira-dubai'),q);
assert.equal(rankServices('نقل تصريح عمل',data)[0].s,'transfer-work-permit-uae');
assert.equal(data.length,202);
console.log('PASS: scoped RERA results, activity routing, verified Ajman inquiry, preserved SIRA/work transfer and 202 records');
