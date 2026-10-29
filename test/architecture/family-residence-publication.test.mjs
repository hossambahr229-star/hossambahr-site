import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
test('reviewed Dubai family residence fields survive both original and active publication inputs',()=>{
const tree=JSON.parse(fs.readFileSync(new URL('../../content/government-service-tree.json',import.meta.url),'utf8')).services;
const matrix=JSON.parse(fs.readFileSync(new URL('../../service-matrix.json',import.meta.url),'utf8')).services;
for(const slug of ['family-residency-uae']){
const upstream=tree.find(x=>x.id==='guide:'+slug),published=matrix.find(x=>x.slug===slug);assert.ok(upstream&&published);
for(const key of ['fees','duration'])assert.equal(published[key],upstream[key],slug+' '+key);
assert.equal(published.officialCardUrl,upstream.evidenceUrl);
assert.equal(published.faq.find(x=>x.question==='ما الرسوم؟').answer,upstream.fees);
assert.equal(published.faq.find(x=>x.question==='كم تستغرق المعاملة؟').answer,upstream.duration);
assert.match(published.duration,/48 ساعة/);assert.match(published.fees,/200 درهم/);assert.match(published.fees,/500 درهم رسم داخل الدولة عند انطباقه/);assert.match(published.fees,/تتجاوز الإقامة سنتين/);
}
});

test('reviewed Dubai family residence pages are refreshed by the production page builder',async()=>{
 const {mkdtemp,mkdir,writeFile,readFile,rm}=await import('node:fs/promises');
 const {tmpdir}=await import('node:os');const {join}=await import('node:path');const {execFileSync}=await import('node:child_process');
 const root=new URL('../../',import.meta.url);
 const review=JSON.parse(fs.readFileSync(new URL('content/moe-edas-field-review-2026-10-08.json',root),'utf8'));
 const slugs=['family-residency-uae'];
 const records=review.records.filter(x=>slugs.includes(x.slug));
 assert.equal(records.length,1);for(const record of records)assert.deepEqual(record.fields,['fees','duration']);
 const matrix=JSON.parse(fs.readFileSync(new URL('service-matrix.json',root),'utf8'));
 const temp=await mkdtemp(join(tmpdir(),'hb-gdrfa-family-publication-'));
 try{
  await mkdir(join(temp,'src/publication'),{recursive:true});await mkdir(join(temp,'content'),{recursive:true});
  await writeFile(join(temp,'src/publication/refresh-reviewed-matrix-pages.mjs'),fs.readFileSync(new URL('src/publication/refresh-reviewed-matrix-pages.mjs',root)));
  await writeFile(join(temp,'service-matrix.json'),JSON.stringify(matrix));
  await writeFile(join(temp,'content/moe-edas-field-review-2026-10-08.json'),JSON.stringify({...review,records}));
  await writeFile(join(temp,'content/partial-service-field-review-2026-10-15.json'),JSON.stringify({reviewedAt:'2026-10-15',records:[]}));
  for(const name of ['mohre-live-field-review-2026-10-16.json','mohre-remaining-field-review-2026-10-16.json','icp-reports-fines-field-review-2026-10-16.json','wps-guidance-source-review-2026-10-21.json','ajman-issuance-field-review-2026-10-24.json','icp-business-exploration-field-review-2026-10-27.json','icp-job-exploration-field-review-2026-10-28.json','icp-tourism-visitor-field-review-2026-10-29.json'])await writeFile(join(temp,'content',name),JSON.stringify({reviewedAt:'2026-10-16',records:[]}));
  for(const slug of slugs){await mkdir(join(temp,'services',slug),{recursive:true});await writeFile(join(temp,'services',slug,'index.html'),'<section><h2>الرسوم</h2><p>old fee</p></section><section><h2>المدة المتوقعة</h2><p>old time</p></section><section><h2>الشروط</h2><p>preserve eligibility</p></section><details><summary>ما الرسوم؟</summary><p>old fee</p></details><details><summary>كم تستغرق المعاملة؟</summary><p>old time</p></details>');}
  execFileSync(process.execPath,[join(temp,'src/publication/refresh-reviewed-matrix-pages.mjs')]);
  for(const slug of slugs){const html=await readFile(join(temp,'services',slug,'index.html'),'utf8');const service=matrix.services.find(x=>x.slug===slug);assert.equal(html.split(service.fees).length-1,2);assert.equal(html.split(service.duration).length-1,2);assert.ok(html.includes('preserve eligibility'));assert.ok(!html.includes('old fee')&&!html.includes('old time'));}
 }finally{await rm(temp,{recursive:true,force:true});}
});
