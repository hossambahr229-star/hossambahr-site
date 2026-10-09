import test from 'node:test';import assert from 'node:assert/strict';import{readFile}from'node:fs/promises';
const matrix=JSON.parse(await readFile(new URL('../../service-matrix.json',import.meta.url)));
test('reviewed Dubai detail facts survive both published languages',async()=>{
 for(const slug of ["تجديد-إقامة-أفراد-الأسرة-في-دبي","تجديد-إقامة-موظف-في-القطاع-الخاص-في-دبي","تعديل-الوضع-داخل-الدولة-في-دبي","إلغاء-إذن-دخول-أو-تأشيرة-صادرة-من-دبي","تأشيرة-سياحية-لدخول-واحد-في-دبي","تأشيرة-استكشاف-فرص-تأسيس-الأعمال-في-دبي","تعديل-بيانات-بطاقة-المنشأة-في-دبي-لجميع-الفئات","إلغاء-بطاقة-المنشأة-في-دبي-لجميع-الفئات"]){
 const s=matrix.services.find(x=>x.slug===slug),ar=await readFile(new URL('../../services/'+slug+'/index.html',import.meta.url),'utf8'),en=await readFile(new URL('../../en/services/'+slug+'/index.html',import.meta.url),'utf8');
 for(const value of [...s.requirements,s.conditions,s.fees])assert.ok(ar.includes(value),slug+': '+value);
 assert.doesNotMatch(en,/An English translation is not yet available/);
 if(slug.includes('إلغاء-بطاقة')){assert.equal(s.duration,'غير موثق بعد');assert.match(en,/no sponsored persons/);assert.match(en,/Commercial Bank of Dubai/);}
 else{assert.ok(ar.includes(s.duration));assert.match(en,/48 hours according to the service card/);assert.doesNotMatch(en,/48 working hours/i);}
 if(slug.includes('تأشيرة-سياحية')){assert.match(en,/Only accredited tourism offices/);assert.match(en,/no security deposit for this visa type/);assert.match(en,/at least six months/);}
 if(slug.includes('تأسيس-الأعمال')){assert.match(en,/Proof of investment/);assert.match(en,/AED 1,000/);assert.match(en,/total may vary by case/);}
 if(slug.includes('تجديد-إقامة'))assert.match(en,/over 18 years of age/);
 }
});
