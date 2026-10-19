import assert from 'node:assert/strict';import{readFile}from'node:fs/promises';import{rankServices}from'../intent-search.js';
const d=JSON.parse(await readFile(new URL('../transaction-discovery-data.json',import.meta.url),'utf8'));
const allowed=['الاستعلام-عن-غرامات-ملف-أو-مكفول-في-دبي','سداد-غرامات-مخالفي-قانون-الإقامة-في-دبي','سداد-غرامة-مخالفة-تأشيرة-أو-إقامة-عبر-icp-خارج-دبي'];
for(const q of ['مخالفة إقامة','غرامة تأشيرة','residence fine','visa overstay penalty']){const rows=rankServices(q,d);assert.equal(rows.length,3,q);assert.ok(rows.every(s=>allowed.includes(s.s)),q);}
assert.equal(rankServices('غرامة إقامة دبي',d).length,2);assert.ok(rankServices('غرامة إقامة دبي',d).every(s=>s.i==='gdrfa-dubai'));
assert.equal(rankServices('مخالفة إقامة الشارقة',d).length,1);assert.equal(rankServices('مخالفة إقامة الشارقة',d)[0].i,'icp');
assert.equal(rankServices('استعلام غرامة إقامة دبي',d)[0].s,allowed[0]);
assert.ok(rankServices('موافقة سيرا',d).every(s=>s.i==='sira-dubai'));assert.ok(rankServices('موافقة ريرا',d).every(s=>s.i==='dld-rera'));
assert.equal(rankServices('تجديد الهوية الإماراتية',d)[0].s,'renew-emirates-id-uae');
assert.notDeepEqual(rankServices('إلغاء إقامة مع غرامة دبي',d).map(s=>s.s),allowed);
console.log('PASS: residence/visa fines stay within real fines pathways and jurisdiction; operations and neighbouring intents preserved');

for(const service of d)for(const title of [service.a,service.e]){const found=rankServices(title,d);assert.ok(found.some(s=>s.s===service.s),'exact canonical name '+title);if(d.filter(s=>s.a===title||s.e===title).length===1)assert.equal(found[0]?.s,service.s,'unique exact canonical name '+title);}
