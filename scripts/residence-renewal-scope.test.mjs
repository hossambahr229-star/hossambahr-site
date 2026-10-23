import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {discoverServices,residenceRenewalIntent} from '../transaction-discovery.js';
const records=JSON.parse(readFileSync('transaction-discovery-data.json','utf8'));
const expected=['تجديد-إقامة-أفراد-الأسرة-في-دبي','تجديد-إقامة-موظف-في-القطاع-الخاص-في-دبي','تجديد-تصريح-إقامة-عبر-icp-خارج-دبي'];
test('clear Arabic and English residence renewal keeps only canonical residence renewal transactions',()=>{
 for(const query of ['تجديد إقامة','تجديد اقامة','أجدد إقامتي','residence renewal','renew residency','Renew my residence']){
  assert.equal(residenceRenewalIntent(query),true,query);
  assert.deepEqual(discoverServices(records,{query}).map(s=>s.s).sort(),[...expected].sort(),query);
 }
});
test('residence renewal retains the correct Dubai versus ICP jurisdiction',()=>{
 for(const query of ['تجديد إقامة','residence renewal']){
  assert.deepEqual(discoverServices(records,{query,emirate:'دبي'}).map(s=>s.s).sort(),expected.slice(0,2).sort());
  assert.deepEqual(discoverServices(records,{query,emirate:'الشارقة'}).map(s=>s.s),expected.slice(2));
 }
});
test('other intents and browsing retain their existing discovery scope',()=>{
 assert.equal(discoverServices(records,{}).length,records.length);
 for(const query of ['تجديد رخصة','renew driving licence','إلغاء إقامة','cancel residence renewal'])assert.equal(residenceRenewalIntent(query),false);
 assert.ok(discoverServices(records,{query:'تجديد رخصة'}).some(s=>/license|licence/.test(s.s)));
 assert.deepEqual(discoverServices(records,{query:'موافقة سيرا'}).map(s=>s.s).sort(),['sira-new-security-activity-license-dubai','sira-security-system-certification-dubai'].sort());
 assert.deepEqual(discoverServices(records,{query:'RERA approval'}).map(s=>s.s).sort(),['dld-real-estate-ad-permit-dubai','real-estate-professional-practice-card-dubai'].sort());
});
