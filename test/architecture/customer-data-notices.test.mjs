import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,mkdtemp,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {privacyCopy,dataAnswer,synchronizeCustomerNotices} from '../../src/publication/synchronize-customer-notices.mjs';
test('notices preserve analytics, publish both languages and remain idempotent',async(t)=>{
 const root=await mkdtemp(join(tmpdir(),'hb-notices-'));
 t.after(()=>rm(root,{recursive:true,force:true}));
 for(const path of ['privacy','faq','en/auth'])await mkdir(join(root,path),{recursive:true});
 const analytics='<section data-hb-analytics-disclosure="v3"><h2>قياس استخدام المنصة</h2><p>Existing disclosure must remain unchanged.</p></section>';
 await writeFile(join(root,'privacy/index.html'),'<main><article class="prose"><p>الإصدار الحالي لا يطلب إنشاء حساب</p>'+analytics+'</article></main>');
 await writeFile(join(root,'faq/index.html'),'<details><summary>هل تخزن المنصة بياناتي الشخصية؟</summary><p>Old answer</p></details>');
 await writeFile(join(root,'en/auth/index.html'),'<a href="/privacy/">Privacy</a><a href="/faq/">Help (Arabic)</a>');
 await writeFile(join(root,'sitemap.xml'),'<urlset></urlset>');
 await synchronizeCustomerNotices(root);
 const once=await readFile(join(root,'privacy/index.html'),'utf8');
 await synchronizeCustomerNotices(root);
 assert.equal(await readFile(join(root,'privacy/index.html'),'utf8'),once);
 assert.ok(once.includes(analytics));assert.doesNotMatch(once,/<p>الإصدار الحالي لا يطلب إنشاء حساب/);
 for(const locale of ['', 'en/']){
  const privacy=await readFile(join(root,locale,'privacy/index.html'),'utf8');assert.match(privacy,/data-customer-data-notice="account-documents-v1"/);assert.match(privacy,/data-hb-analytics-disclosure/);
  const faq=await readFile(join(root,locale,'faq/index.html'),'utf8');assert.ok(faq.includes(dataAnswer(Boolean(locale))));
 }
 const auth=await readFile(join(root,'en/auth/index.html'),'utf8');assert.match(auth,/href="\/en\/privacy\/"/);assert.match(auth,/href="\/en\/faq\/"/);assert.doesNotMatch(auth,/Help \(Arabic\)/);
 const sitemap=await readFile(join(root,'sitemap.xml'),'utf8');assert.equal((sitemap.match(/en\/privacy/g)||[]).length,1);assert.equal((sitemap.match(/en\/faq/g)||[]).length,1);
});
test('both notices cover public AI, stored accounts, documents and external handoff',()=>{for(const en of [false,true])assert.equal(privacyCopy(en).length,5);assert.match(privacyCopy(true).flat().join(' '),/private document storage/);});
