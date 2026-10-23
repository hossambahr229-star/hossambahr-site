import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const review=read('content/det-commercial-permit-time-review-2026-10-23.json');
test('DET commercial-permit time survives AR/EN generators without verifying missing fields',()=>{
 const item=review.records[0];
 const source=read('content/government-service-tree.json').services.find(x=>x.id===item.sourceId);
 const reg=read('src/registry/published-services.json').services.find(x=>x.slug===item.slug);
 assert.equal(source.duration,item.durationAr);
 assert.equal(reg.processingTime.text,item.durationAr);
 assert.equal(reg.verification.durationVerified,true);
 assert.equal(reg.governmentFees.text,item.feesAr);
 assert.equal(reg.verification.feesVerified,true);
 for(const field of ['requirementsVerified','eligibilityVerified','detailsVerified']) assert.equal(reg.verification[field],false,field);
 assert.equal(reg.verification.verifiedDetailCount,2);
 assert.equal(reg.documents.items.length,0);
 const pending=read('qa/remaining-partial-services-2026-10-15.json');
 assert.equal(pending.remaining,32);
 assert.deepEqual(pending.services.find(x=>x.slug===item.slug).unverifiedFields,['documents','eligibility']);
 for(const [prefix,text] of [['',item.durationAr],['en/',item.durationEn]]){
 const html=fs.readFileSync(prefix+'services/'+item.slug+'/index.html','utf8');
 assert.ok(html.includes(text),prefix+' service must render the reviewed time');
 assert.ok(html.includes(prefix ? item.feesEn : item.feesAr),'reviewed conditional fees');
 assert.ok(html.includes('971503780460'),'assisted path retained');
 assert.ok(html.includes('request-to-issue-commercial-permit'),'government path retained');
 }
 assert.deepEqual(review.completed,[]);
});

test('Empty DET document lists explicitly state uncertainty without changing verification',()=>{
 const publication=read('src/publication/det-publication-registry.json');
 const tree=read('content/government-service-tree.json');
 const registry=read('src/registry/published-services.json');
 const ids=new Map(tree.services.map(x=>[x.id,x]));
 let checked=0;
 for(const entry of publication.services.filter(x=>!x.normalization?.excludeFromRealTotal)){
  const source=ids.get(entry.sourceId) ?? entry.serviceData;
  if(!source || source.requirements?.filter(Boolean).length)continue;
  const record=registry.services.find(x=>x.slug===entry.slug);
  if(!record) continue;
  assert.equal(record.verification.requirementsVerified,false);
  const html=fs.readFileSync('services/'+entry.slug+'/index.html','utf8');
  assert.ok(html.includes("لم نتحقق بعد من قائمة المستندات المطلوبة لهذه الخدمة؛ راجع بطاقة الجهة الرسمية لتأكيدها. عدم عرض مستندات هنا لا يعني أن الخدمة لا تتطلب مستندات."),entry.slug);
  assert.ok(!html.includes('<h2>المستندات والمتطلبات</h2><ul></ul>'),entry.slug);
  checked++;
 }
 assert.ok(checked>0);
});
