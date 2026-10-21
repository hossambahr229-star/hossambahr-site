import test from'node:test';import assert from'node:assert/strict';import{readFile}from'node:fs/promises';import{transactionObject,transactionObjectMatches,transactionObjectNeedsEmirate}from'../supabase/functions/public-ai-concierge/transaction-object.ts';import{normalizeIntent}from'../intent-search.js';
const rows=JSON.parse(await readFile('transaction-discovery-data.json','utf8'));
const cases=[
['عايز ألغي شركة وعندي عمال في الشارقة','sharjah-economic-license-cancellation'],
['I want to cancel a company with workers in Sharjah','sharjah-economic-license-cancellation'],
['عايز أجدد رخصة القيادة في دبي','renew-driving-license-dubai'],
['أريد موافقة مبدئية لإصدار رخصة اقتصادية في الفجيرة','fujairah-economic-initial-approval'],
['عايز أسجل منشأتي في جمارك دبي','dubai-customs-business-registration'],
['أريد شهادة تخليص سيارة من جمارك دبي','vehicle-clearance-certificate-dubai-customs'],
['عايز أغير مدير الشركة في دبي','change-company-manager-dubai'],
['I need to add a partner to my licence in Ras Al Khaimah','ras-al-khaimah-add-remove-partner'],
['عايز أصدق وكالة في محاكم دبي','power-of-attorney-ratification-dubai'],
['I need Ministry of Foreign Affairs attestation for a personal document in Abu Dhabi','تصديق-مستند-شخصي-داخل-الإمارات'],
['I need a part time work permit in Sharjah','part-time-work-permit-uae'],
['I need to file a private sector labour complaint in Ajman','register-labour-complaints-private-sector-employees'],
['أريد أطلع بطاقة مندوب علاقات عامة للشركة في دبي','إصدار-بطاقة-مندوب-علاقات-عامة-pro']
];
for(const[q,slug]of cases)test(q,()=>{const intent=transactionObject(normalizeIntent(q));assert.ok(intent);const r=rows.find(r=>r.s===slug);assert.ok(r);assert.ok(transactionObjectMatches(intent,normalizeIntent(r.a+' '+r.e),r.i));if(intent.kind==='company-closure'){const agency=rows.find(r=>r.s==='employment-agency-license-cancellation-mohre');assert.equal(transactionObjectMatches(intent,normalizeIntent(agency.a+' '+agency.e),agency.i),false);}});
for(const q of ['I want to cancel a recruitment agency licence','عايز ألغي شركة توظيف','I want to cancel a temporary employment agency licence','I want to cancel my company work permits','أريد إلغاء تصاريح عمل شركتي','أجدد إقامة زوجتي في الفجيرة','موافقة سيرا','تصريح إعلان عقاري'])test('does not coerce unrelated object '+q,()=>assert.equal(transactionObject(normalizeIntent(q)),null));
test('unsupported operation does not select neighbouring issuance',()=>{const i=transactionObject(normalizeIntent('I need to cancel a part time work permit'));assert.ok(i);assert.equal(transactionObjectMatches(i,'issuance of a new work permit part time work permit','mohre'),false);});

test('local objects ask for jurisdiction while federal objects do not invent one',()=>{assert.equal(transactionObjectNeedsEmirate(transactionObject(normalizeIntent('I want to close a company'))),true);assert.equal(transactionObjectNeedsEmirate(transactionObject(normalizeIntent('I need a part time work permit'))),false);});
