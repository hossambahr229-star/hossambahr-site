import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'../..');
const matrix=JSON.parse(await readFile(resolve(root,'service-matrix.json'),'utf8'));
const reviews=await Promise.all(['content/moe-edas-field-review-2026-10-08.json','content/partial-service-field-review-2026-10-15.json','content/mohre-live-field-review-2026-10-16.json','content/mohre-remaining-field-review-2026-10-16.json','content/icp-reports-fines-field-review-2026-10-16.json','content/wps-guidance-source-review-2026-10-21.json','content/ajman-issuance-field-review-2026-10-24.json','content/icp-business-exploration-field-review-2026-10-27.json'].map(async path=>JSON.parse(await readFile(resolve(root,path),'utf8'))));
const latestReviewBySlug=new Map();
for(const source of reviews)for(const record of source.records){const dated={...record,reviewedAt:record.reviewedAt??source.reviewedAt};const previous=latestReviewBySlug.get(record.slug);if(!previous||dated.reviewedAt>=previous.reviewedAt)latestReviewBySlug.set(record.slug,dated);}
const review={records:[...latestReviewBySlug.values()]};
const esc=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
for(const record of review.records){
 const service=matrix.services.find(s=>s.slug===record.slug);
 if(!service||service.lastReviewed!==(record.reviewedAt??review.reviewedAt))throw Error('Missing reviewed source: '+record.slug);
 const file=resolve(root,'services',service.slug,'index.html');let html=await readFile(file,'utf8');
 if(service.officialRouteMode==='official-guidance'){
  const replaceOne=(pattern,value,label)=>{let count=0;html=html.replace(pattern,()=>{count++;return value;});if(count!==1)throw Error(service.slug+': expected one '+label);};
  replaceOne(/data-official-route-mode="[^"]*"/,'data-official-route-mode="official-guidance"','route mode');
  replaceOne(/<p class="verification-note">[\s\S]*?<\/p>/,'<p class="verification-note">'+esc(service.officialRouteNote)+'</p>','guidance note');
  replaceOne(/<dt>حالة المسار<\/dt><dd>[\s\S]*?<\/dd>/,'<dt>حالة المسار</dt><dd>دليل حكومي رسمي</dd>','route label');
  replaceOne(/<section id="official-route"[^>]*>[\s\S]*?<\/section>/,'<section id="official-route" class="official-source-panel"><h2>المسار الرسمي الصحيح</h2><div class="route-note"><b>دليل حكومي رسمي، وليس نموذج تنفيذ مباشر.</b><p>'+esc(service.officialRouteNote)+'</p></div><a class="route-primary" href="'+esc(service.officialCardUrl)+'" rel="noopener noreferrer">فتح الدليل الحكومي الرسمي ↗</a></section>','guidance section');
  html=html.replace(/<section\b[^>]*\bdata-registry-steps[^>]*>[\s\S]*?<\/section>/g,'');
 }
 const reviewedFields=new Set([...(record.fields||[]),...(record.remaining||[]).map(field=>field==='government_fee_amount'?'fees':field)]);
 if(service.emirate==='الإمارات عدا دبي'){
  let headings=0,facts=0;
  html=html.replace(/(<header class="page-hero service-hero"><span class="eyebrow">)[^<]*(<\/span>)/,(_,open,close)=>{headings++;return open+esc(service.authority.name)+' · '+esc(service.emirate)+close;});
  html=html.replace(/(<dt>الإمارة<\/dt><dd>)[\s\S]*?(<\/dd>)/,(_,open,close)=>{facts++;return open+esc(service.emirate)+close;});
  if(headings!==1||facts!==1)throw Error(service.slug+': cannot refresh reviewed jurisdiction labels');
 }
 const sections=[['requirements','(?:المتطلبات والمستندات|المستندات والمتطلبات)',service.noDocumentsRequired?'<p>لا توجد مستندات مطلوبة وفق بطاقة الخدمة الرسمية.</p>':'<ul>'+service.requirements.map(t=>'<li>'+esc(t)+'</li>').join('')+'</ul>'],['fees','الرسوم','<p>'+esc(service.fees)+'</p>'],['duration','(?:المدة المتوقعة|مدة الإنجاز)','<p>'+esc(service.duration)+'</p>'],['conditions','الشروط','<p>'+esc(service.conditions)+'</p>'],['specialCases','الحالات الخاصة وأسباب التعطل','<p>'+esc(service.specialCases.replace(' رابط التنفيذ محفوظ إلى newestablishment.',''))+'</p>']];
 for(const [field,heading,body] of sections){
  if(!reviewedFields.has(field))continue;
  let matches=0;
  html=html.replace(new RegExp('(<section[^>]*><h2>'+heading+'</h2>)[\\s\\S]*?</section>','g'),(_,open)=>{matches++;return open+body+'</section>';});
  if(matches!==1)throw Error(service.slug+': expected one '+heading+' section');
 }
 for(const [question,answer] of [['ما الرسوم؟',service.fees],['كم تستغرق المعاملة؟',service.duration]]){
  if(!reviewedFields.has(question==='ما الرسوم؟'?'fees':'duration'))continue;
  const start='<details><summary>'+question+'</summary>';const position=html.indexOf(start);
  if(position!==-1){const end=html.indexOf('</details>',position);if(end===-1)throw Error('Unclosed FAQ');html=html.slice(0,position)+start+'<p>'+esc(answer)+'</p></details>'+html.slice(end+10);}
 }
 await writeFile(file,html,'utf8');
}
console.log('Reviewed matrix detail pages refreshed: '+review.records.length);
